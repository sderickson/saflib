import type { DbKey } from "@saflib/drizzle";
import { getByIdWorkflowRun } from "@saflib/new-workflows-db";
import { advanceRun, type StepResult, type WorkflowDefinition } from "@saflib/new-workflows";
import { printAndPersist } from "./terminal-output.ts";

/**
 * The loop `advanceRun` intentionally doesn't own: keep calling it as long
 * as each step succeeds on its own, stopping the moment a step needs an
 * agent turn from `print` mode, a human action, errors, or the run
 * finishes. `dry`/`script` mode runs never produce `awaiting_*`, so this
 * naturally runs them to completion in one call.
 */
export async function runAdvanceLoop(
  dbKey: DbKey,
  def: WorkflowDefinition<any, any>,
  runId: string,
): Promise<StepResult> {
  while (true) {
    const { result: run, error } = await getByIdWorkflowRun(dbKey, { id: runId });
    if (error) throw error;
    const stepIndex = run.current_step_index;

    const { output, result } = advanceRun(dbKey, def, runId);
    await printAndPersist(dbKey, runId, stepIndex, output);
    const outcome = await result;

    if (outcome.status !== "success") return outcome;
  }
}
