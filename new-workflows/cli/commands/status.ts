import { getByIdWorkflowRun } from "@saflib/new-workflows-db";
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
      console.log(`Run:    ${run.id}`);
      console.log(`Workflow: ${run.workflow_ref}`);
      console.log(`Status: ${run.status}`);
      console.log(`Step:   ${run.current_step_index}`);
    });
}
