import type { DbKey } from "@saflib/drizzle";
import { getByIdWorkflowRun, getChildByParentStepWorkflowRun } from "@saflib/new-workflows-db";
import type { CliContext } from "../types.ts";
import { readRunPointer } from "../run-pointer.ts";

export function addStatusCommand(ctx: CliContext): void {
  ctx.program
    .command("status")
    .description("Show the status of the current run (from .new-workflow-run.json).")
    .action(async () => {
      const pointer = readRunPointer(process.cwd());
      if (!pointer) {
        console.error("No run found for this directory.");
        process.exitCode = 1;
        return;
      }
      const { result: run, error } = await getByIdWorkflowRun(ctx.dbKey, { id: pointer.runId });
      if (error) {
        console.error(error.message);
        process.exitCode = 1;
        return;
      }
      await printRunAndChildren(ctx.dbKey, run.id, 0);
    });
}

/**
 * Prints a run's status, then recurses into any `call-workflow` child run
 * for its current step — "step 3 of the top level, step 2 of the workflow
 * called from step 3" as an indented breadcrumb, not just the root's own
 * (necessarily vaguer, since it's blocked on a nested run) status line.
 */
async function printRunAndChildren(dbKey: DbKey, runId: string, depth: number): Promise<void> {
  const { result: run, error } = await getByIdWorkflowRun(dbKey, { id: runId });
  if (error) {
    console.error(error.message);
    process.exitCode = 1;
    return;
  }
  const indent = "  ".repeat(depth);
  console.log(`${indent}Run:      ${run.id}`);
  console.log(`${indent}Workflow: ${run.workflow_ref}`);
  console.log(`${indent}Status:   ${run.status}`);
  console.log(`${indent}Step:     ${run.current_step_index}`);

  const { result: child } = await getChildByParentStepWorkflowRun(dbKey, {
    parent_run_id: run.id,
    parent_step_index: run.current_step_index,
  });
  if (child) {
    console.log(`${indent}  ↳ nested run:`);
    await printRunAndChildren(dbKey, child.id, depth + 2);
  }
}
