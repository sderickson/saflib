import {
  getByIdWorkflowRun,
  listByRunWorkflowStep,
  WorkflowRunNotFoundError,
} from "@saflib/new-workflows-db";
import type { DbKey } from "@saflib/new-workflows-db";
import type { Readable } from "node:stream";
import { createOutputStream } from "./output.ts";
import { runAgentTurn } from "./agents/dispatch.ts";
import { withRunLock, RUN_LOCK_MESSAGE } from "./run-lock.ts";
import type { WorkflowContext } from "./types.ts";

export type FreeformAgentMessageResult =
  | { status: "ok"; shouldContinue: boolean }
  | { status: "error"; message: string };

async function resolveRunWorkingDirectory(
  dbKey: DbKey,
  runId: string,
): Promise<{ cwd: string; copiedFiles: Record<string, string> }> {
  const { result: priorSteps, error: priorError } = await listByRunWorkflowStep(dbKey, {
    run_id: runId,
  });
  if (priorError) throw priorError;

  const { result: run, error: runError } = await getByIdWorkflowRun(dbKey, { id: runId });
  if (runError) throw runError;

  let cwd = run.cwd;
  const copiedFiles: Record<string, string> = {};
  for (const priorStep of priorSteps ?? []) {
    if (priorStep.status !== "success" || !priorStep.result) continue;
    const r = priorStep.result as { copiedFiles?: Record<string, string>; newCwd?: string };
    if (r.copiedFiles) Object.assign(copiedFiles, r.copiedFiles);
    if (r.newCwd) cwd = r.newCwd;
  }
  return { cwd, copiedFiles };
}

async function runFreeformAgentMessage(
  dbKey: DbKey,
  runId: string,
  message: string,
  write: (chunk: Parameters<WorkflowContext["log"]>[0]) => void,
): Promise<FreeformAgentMessageResult> {
  const trimmed = message.trim();
  if (!trimmed) {
    return { status: "error", message: "Message is required" };
  }

  const { result: run, error: runError } = await getByIdWorkflowRun(dbKey, { id: runId });
  if (runError) {
    if (runError instanceof WorkflowRunNotFoundError) {
      return { status: "error", message: "Run not found" };
    }
    throw runError;
  }

  if (run.mode !== "run") {
    return {
      status: "error",
      message: "Direct agent messages are only supported for runs in run mode",
    };
  }
  if (!run.agent_config) {
    return { status: "error", message: "This run has no agent configuration" };
  }

  const { cwd, copiedFiles } = await resolveRunWorkingDirectory(dbKey, runId);
  const stepIndex = run.current_step_index;

  write({
    channel: "tool",
    level: "info",
    content: "Direct agent message (does not advance the workflow)",
  });
  write({ channel: "agent-input", level: "info", content: trimmed });

  const ctx: WorkflowContext = {
    runId,
    workflowId: run.workflow_ref,
    stepIndex,
    dbKey,
    mode: "run",
    cwd,
    originalWorkingDirectory: run.cwd,
    agentConfig: run.agent_config,
    copiedFiles,
    skipTodos: run.skip_todos,
    isResume: false,
    log: write,
  };

  try {
    const { shouldContinue } = await runAgentTurn(trimmed, ctx);
    return { status: "ok", shouldContinue };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Runs one agent CLI turn with arbitrary user text — no workflow step row,
 * no run index advance, no post-step commit. Uses the same run lock as
 * `advanceRun` so agent/git work stays serialized.
 */
export function sendFreeformAgentMessage(
  dbKey: DbKey,
  runId: string,
  message: string,
): { output: Readable; result: Promise<FreeformAgentMessageResult> } {
  const { stream, write, end } = createOutputStream();

  const resultPromise = withRunLock(dbKey, runId, () =>
    runFreeformAgentMessage(dbKey, runId, message, write),
  )
    .then((outcome): FreeformAgentMessageResult =>
      outcome.locked ? { status: "error", message: RUN_LOCK_MESSAGE } : outcome.result,
    )
    .finally(end);

  return { output: stream, result: resultPromise };
}
