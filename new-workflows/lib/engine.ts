import {
  createWorkflowRun,
  getByIdWorkflowRun,
  updateStatusAndStepWorkflowRun,
  createWorkflowStep,
  updateResultWorkflowStep,
  listByRunWorkflowStep,
} from "@saflib/new-workflows-db";
import type { DbKey, WorkflowRunStatus } from "@saflib/new-workflows-db";
import { resolveRef } from "@saflib/git";
import { createOutputStream } from "./output.ts";
import { commitIfDirty, revertUncommittedChanges } from "./git.ts";
import { summarizeStepInput } from "./describe-steps.ts";
import { withRunLock, RUN_LOCK_MESSAGE, getActiveLockHolder } from "./run-lock.ts";
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
    skipTodos?: boolean;
    /** Set by `call-workflow` when this run is a nested child of another. */
    parentRunId?: string;
    parentStepIndex?: number;
  },
): Promise<string> {
  // Best-effort, not fatal: `cwd` might not be inside a git repo (a scratch
  // dir in tests, say) — `resolveRef` just needs *any* path inside the
  // repo, not necessarily its root, since git walks up to find `.git`
  // itself. Bookends the run — see `base_commit_hash`'s own doc comment.
  const { result: baseCommitHash } = resolveRef(opts.cwd, "HEAD");

  const { result, error } = await createWorkflowRun(dbKey, {
    workflow_source: "code",
    workflow_ref: def.id,
    input: opts.input,
    mode: opts.mode,
    skip_todos: opts.skipTodos ?? false,
    cwd: opts.cwd,
    agent_config: opts.agentConfig ?? null,
    base_commit_hash: baseCommitHash ?? null,
    parent_run_id: opts.parentRunId ?? null,
    parent_step_index: opts.parentStepIndex ?? null,
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

export interface AdvanceRunOptions {
  /**
   * Discard uncommitted changes in the run's repo (see
   * `revertUncommittedChanges`) before (re-)running the current step —
   * for retrying a just-failed step from a clean slate instead of on top
   * of whatever it left behind.
   */
  revert?: boolean;
  /**
   * Skip the current step entirely instead of running it: commits
   * whatever's currently dirty (if anything) and advances past it, same
   * as a successful run of it.
   */
  skip?: boolean;
  /** See `WorkflowContext.extraPrompt`. Ignored when `skip` is set (nothing gets prompted). */
  extraPrompt?: string;
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
  options?: AdvanceRunOptions,
): { output: Readable; result: Promise<StepResult> } {
  const { stream, write, end } = createOutputStream();

  // Locked out entirely — no step row created, no run state touched — if
  // another root `advanceRun` call is already doing real work. See
  // `run-lock.ts` for why: this system's git integration is repo-wide and
  // not safe under concurrent steps. Nested calls (a `call-workflow`
  // step's own `advanceRun` for its child) are reentrant and pass through.
  const resultPromise = withRunLock(dbKey, runId, () => runStep(dbKey, def, runId, write, options))
    .then((outcome): StepResult => (outcome.locked ? { status: "error", message: RUN_LOCK_MESSAGE } : outcome.result))
    .finally(end);

  return { output: stream, result: resultPromise };
}

/**
 * Whether `runId` (a *root* run — this is `undefined`/`false` for a
 * nested child's own id, since nested calls don't re-label the lock; see
 * `withRunLock`'s reentrancy) is currently being advanced somewhere in
 * this process, right now — including while a nested `call-workflow`
 * descendant is the one actually doing the work. Reflects live server
 * state rather than any one client's own (page-reload-fragile) notion of
 * "is my request still pending" — e.g. a `GET /runs/:id` response can use
 * this to tell a freshly-reloaded page "yes, a step really is in progress
 * right now" even though its own `status` field is still whatever it was
 * after the *last completed* step.
 */
export function isRunAdvancing(dbKey: DbKey, runId: string): boolean {
  return getActiveLockHolder(dbKey)?.label === runId;
}

async function runStep(
  dbKey: DbKey,
  def: WorkflowDefinition<any, any>,
  runId: string,
  write: (chunk: Parameters<WorkflowContext["log"]>[0]) => void,
  options?: AdvanceRunOptions,
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

  if (options?.revert) {
    try {
      await revertUncommittedChanges(run.cwd);
    } catch (error) {
      return {
        status: "error",
        message: `Failed to revert uncommitted changes before retrying: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
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
  const isResume = (priorSteps ?? []).some((s) => s.step_index === stepIndex);

  const now = new Date();
  const { result: stepRow, error: stepCreateError } = await createWorkflowStep(
    dbKey,
    { run_id: runId, step_index: stepIndex, kind: step.kind, now },
  );
  if (stepCreateError) throw stepCreateError;

  // `def.context()` and `step.input()` run inside this try, not before it —
  // some workflows validate input from inside `context()` (e.g.
  // `drizzle/update-schema`'s plural-table-name check) and throw
  // synchronously. That used to happen *before* the step row above was
  // created and before the run's status/step were ever persisted, so a
  // context-level failure left the run stuck at its original "pending"
  // status forever — invisible to callers checking `status === "failed"`
  // (see `call-workflow.ts`'s retry-refreshes-stale-input logic, which
  // silently never fired for this failure mode) and to anyone retrying,
  // since the retry saw no recorded failure to react to.
  let stepInput: unknown;
  let stepResult: StepOutcome;
  if (options?.skip) {
    stepResult = { status: "success", result: { skipped: true } };
  } else {
    try {
      const context = def.context({ input: run.input, cwd: run.cwd });
      const ctx: WorkflowContext = {
        runId,
        workflowId: def.id,
        stepIndex,
        dbKey,
        mode: run.mode,
        cwd,
        originalWorkingDirectory: run.cwd,
        agentConfig: run.agent_config ?? undefined,
        copiedFiles,
        skipTodos: run.skip_todos,
        isResume,
        extraPrompt: options?.skip ? undefined : options?.extraPrompt,
        log: write,
      };
      stepInput = step.input({ context });
      stepResult = await step.run(stepInput, ctx);
    } catch (error) {
      stepResult = {
        status: "error",
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  if (stepResult.status === "success") {
    const label = summarizeStepInput(step.kind, stepInput) ?? step.kind;
    const commitMessage = options?.skip
      ? `${def.id}: skip ${label}`
      : `${def.id}: ${label}`;
    try {
      const committed = await commitIfDirty(run.cwd, commitMessage);
      if (committed) {
        write({ channel: "tool", level: "info", content: `Committed: ${commitMessage}` });
      }
    } catch (error) {
      // The whole revert/skip/retry recovery flow (`options.revert`,
      // `call-workflow.ts`'s stale-input refresh on a *failed* child, etc.)
      // assumes every successful step leaves a clean commit behind before
      // the next step runs. A commit failure breaks that invariant — left
      // as just a log line, the run would silently keep going with an
      // ever-growing pile of uncommitted, unattributed changes instead of
      // stopping where the problem actually is. Treat it as this step
      // failing outright instead.
      stepResult = {
        status: "error",
        message: `Step succeeded but failed to commit its changes: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
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

  // Best-effort, not fatal, same as `createRun`'s `base_commit_hash` —
  // captured right now, once, rather than left to a later live `HEAD`
  // lookup that would drift as unrelated work lands afterward.
  const completionHash =
    nextStatus === "done" ? resolveRef(cwd, "HEAD").result ?? null : undefined;

  await updateStatusAndStepWorkflowRun(dbKey, {
    id: runId,
    status: nextStatus,
    current_step_index: nextStepIndex,
    completion_hash: completionHash,
    now: finishedAt,
  });

  return stepResult;
}
