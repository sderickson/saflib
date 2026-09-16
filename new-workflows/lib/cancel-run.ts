import type { DbKey } from "@saflib/new-workflows-db";
import { getByIdWorkflowRun, getChildByParentStepWorkflowRun } from "@saflib/new-workflows-db";
import { cancelActiveAgentProcess } from "./agents/registry.ts";

/**
 * Cancels the run's own agent process if it has one — but a run whose
 * current step is `call-workflow` never registers one itself; it's just
 * blocked awaiting a nested child run's `advanceRun` (see
 * `runCallWorkflowStep`), and the *child* is the one actually driving an
 * agent (see `registerActiveAgentProcess` in `claude-agent.ts`). Walks
 * down through however many `call-workflow` levels are currently active
 * until it finds (and cancels) the leaf actually running one — mirroring
 * how the engine already treats nested calls as transparent to the
 * caller.
 */
export async function cancelRunAndDescendants(dbKey: DbKey, runId: string): Promise<boolean> {
  if (cancelActiveAgentProcess(runId)) return true;

  const { result: run } = await getByIdWorkflowRun(dbKey, { id: runId });
  if (!run) return false;

  const { result: child } = await getChildByParentStepWorkflowRun(dbKey, {
    parent_run_id: runId,
    parent_step_index: run.current_step_index,
  });
  if (!child) return false;

  return cancelRunAndDescendants(dbKey, child.id);
}
