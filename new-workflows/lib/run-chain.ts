import { getByIdWorkflowRun } from "@saflib/new-workflows-db";
import type { DbKey, WorkflowRunEntity } from "@saflib/new-workflows-db";

/** Guards the parent walk against a (corrupt) cycle in `parent_run_id`. */
const MAX_RUN_DEPTH = 32;

/**
 * `run` and its `call-workflow` ancestors, root first: `[root, …, run]`.
 * Stops early (treating the furthest run found as the root) if a parent
 * row is missing.
 */
export async function loadRunChain(
  dbKey: DbKey,
  run: WorkflowRunEntity,
): Promise<WorkflowRunEntity[]> {
  const chain = [run];
  let current = run;
  for (let depth = 0; current.parent_run_id && depth < MAX_RUN_DEPTH; depth++) {
    const parent = await getByIdWorkflowRun(dbKey, { id: current.parent_run_id });
    if (parent.error) break;
    current = parent.result;
    chain.unshift(current);
  }
  return chain;
}
