import type { DbKey } from "@saflib/drizzle";
import {
  createWorkflowRun,
  getByIdWorkflowRun,
  updateStatusAndStepWorkflowRun,
  createWorkflowStep,
  updateResultWorkflowStep,
  listByRunWorkflowStep,
} from "@saflib/new-workflows-db";
import type { WorkflowRunStatus } from "@saflib/new-workflows-db";
import { createOutputStream } from "./output.ts";
import type {
  AgentConfig,
  StepFn,
  StepOutcome,
  StepResult,
  WorkflowContext,
  WorkflowDefinition,
  WorkflowRunMode,
  WorkflowStep,
} from "./types.ts";
import type { Readable } from "node:stream";

export function defineWorkflow<Input, C>(
  def: WorkflowDefinition<Input, C>,
): WorkflowDefinition<Input, C> {
  return def;
}

/** Builds one `WorkflowStep` from a step-primitive function and an input-builder. */
export function step<Input, C>(
  kind: string,
  fn: StepFn<Input>,
  input: (arg: { context: C }) => Input,
): WorkflowStep<C> {
  return {
    kind,
    input: input as (arg: { context: unknown }) => unknown,
    run: fn as StepFn<unknown>,
  };
}

export async function createRun(
  dbKey: DbKey,
  def: WorkflowDefinition<any, any>,
  opts: {
    input: Record<string, unknown>;
    cwd: string;
    mode: WorkflowRunMode;
    agentConfig?: AgentConfig;
  },
): Promise<string> {
  const { result, error } = await createWorkflowRun(dbKey, {
    workflow_source: "code",
    workflow_ref: def.id,
    input: opts.input,
    mode: opts.mode,
    cwd: opts.cwd,
    agent_config: (opts.agentConfig as Record<string, unknown> | undefined) ?? null,
    now: new Date(),
  });
  if (error) throw error;
  return result.id;
}

function statusForStepResult(status: StepOutcome["status"]): WorkflowRunStatus {
  switch (status) {
    case "success":
      return "running";
    case "error":
      return "failed";
    case "awaiting_prompt":
      return "awaiting_prompt";
    case "awaiting_user":
      return "awaiting_user";
  }
}

/**
 * Runs exactly one step of a run — the only execution entry point lib
 * exposes. Never loops, never decides whether to keep going; the caller
 * drains `output` and inspects `result` to decide what to do next.
 */
export function advanceRun(
  dbKey: DbKey,
  def: WorkflowDefinition<any, any>,
  runId: string,
): { output: Readable; result: Promise<StepResult> } {
  const { stream, write, end } = createOutputStream();

  const resultPromise = runStep(dbKey, def, runId, write).finally(end);

  return { output: stream, result: resultPromise };
}

async function runStep(
  dbKey: DbKey,
  def: WorkflowDefinition<any, any>,
  runId: string,
  write: (chunk: Parameters<WorkflowContext["log"]>[0]) => void,
): Promise<StepResult> {
  const { result: run, error: runError } = await getByIdWorkflowRun(dbKey, {
    id: runId,
  });
  if (runError) throw runError;

  const stepIndex = run.current_step_index;
  const step = def.steps[stepIndex];
  if (!step) {
    return { status: "done" };
  }

  const { result: priorSteps, error: priorError } = await listByRunWorkflowStep(
    dbKey,
    { run_id: runId },
  );
  if (priorError) throw priorError;

  let cwd = run.cwd;
  const copiedFiles: Record<string, string> = {};
  for (const priorStep of priorSteps ?? []) {
    if (priorStep.status !== "success" || !priorStep.result) continue;
    const r = priorStep.result as { copiedFiles?: Record<string, string>; newCwd?: string };
    if (r.copiedFiles) Object.assign(copiedFiles, r.copiedFiles);
    if (r.newCwd) cwd = r.newCwd;
  }

  const context = def.context({ input: run.input, cwd: run.cwd });

  const ctx: WorkflowContext = {
    runId,
    workflowId: def.id,
    mode: run.mode,
    cwd,
    originalWorkingDirectory: run.cwd,
    agentConfig: (run.agent_config as AgentConfig | null) ?? undefined,
    copiedFiles,
    log: write,
  };

  const now = new Date();
  const { result: stepRow, error: stepCreateError } = await createWorkflowStep(
    dbKey,
    { run_id: runId, step_index: stepIndex, kind: step.kind, now },
  );
  if (stepCreateError) throw stepCreateError;

  const stepInput = step.input({ context });
  let stepResult: StepOutcome;
  try {
    stepResult = await step.run(stepInput, ctx);
  } catch (error) {
    stepResult = {
      status: "error",
      message: error instanceof Error ? error.message : String(error),
    };
  }

  const finishedAt = new Date();
  await updateResultWorkflowStep(dbKey, {
    id: stepRow.id,
    status: stepResult.status === "success" ? "success" : stepResult.status,
    result: "result" in stepResult ? (stepResult.result ?? null) : null,
    error: stepResult.status === "error" ? stepResult.message : null,
    now: finishedAt,
  });

  const isLastStep = stepIndex + 1 >= def.steps.length;
  const nextStepIndex = stepResult.status === "success" ? stepIndex + 1 : stepIndex;
  const nextStatus: WorkflowRunStatus =
    stepResult.status === "success" && isLastStep
      ? "done"
      : statusForStepResult(stepResult.status);

  await updateStatusAndStepWorkflowRun(dbKey, {
    id: runId,
    status: nextStatus,
    current_step_index: nextStepIndex,
    now: finishedAt,
  });

  return stepResult;
}
