import type { DbKey, WorkflowRunEntity } from "@saflib/new-workflows-db";
import { listByRunWorkflowStep } from "@saflib/new-workflows-db";
import { CANCELLED_BY_USER_MESSAGE } from "@saflib/new-workflows";

/**
 * Whether `run`'s current failure is a user-initiated Stop, not a genuine
 * step error — there's no dedicated `WorkflowRunStatus` for this (see
 * `workflow-run-status.yaml`; cancelling just makes the in-flight step's
 * own promise reject, which lands as an ordinary `"failed"`), so this
 * looks at the blocking step's own persisted error message instead. Only
 * meaningful (and only queried) for a `"failed"` run — a step that hasn't
 * failed has nothing to have been cancelled.
 */
export async function wasRunCancelled(dbKey: DbKey, run: WorkflowRunEntity): Promise<boolean> {
  if (run.status !== "failed") return false;
  const { result: steps } = await listByRunWorkflowStep(dbKey, { run_id: run.id });
  // A retried step can have multiple rows at the same `step_index` (one
  // per attempt) — the *last* one in run order is the one actually
  // blocking the run right now.
  const blockingStep = [...(steps ?? [])]
    .reverse()
    .find((s) => s.step_index === run.current_step_index);
  return blockingStep?.error?.includes(CANCELLED_BY_USER_MESSAGE) ?? false;
}
