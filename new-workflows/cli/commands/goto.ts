import { getByIdWorkflowRun, updateStatusAndStepWorkflowRun } from "@saflib/new-workflows-db";
import type { CliContext } from "../types.ts";
import { readRunPointer } from "../run-pointer.ts";
import { cliCwd } from "../cli-cwd.ts";

/** Debugging aid: jump `current_step_index` directly. No XState snapshot surgery needed. */
export function addGotoCommand(ctx: CliContext): void {
  ctx.program
    .command("goto")
    .description("Jump the current run to a specific step index.")
    .argument("<stepIndex>", "Step index to jump to")
    .action(async (stepIndexArg: string) => {
      const pointer = readRunPointer(cliCwd());
      if (!pointer) {
        console.error("No run found for this directory.");
        process.exitCode = 1;
        return;
      }
      const stepIndex = Number(stepIndexArg);
      if (!Number.isInteger(stepIndex) || stepIndex < 0) {
        console.error(`Invalid step index: ${stepIndexArg}`);
        process.exitCode = 1;
        return;
      }
      const { result: run, error: getError } = await getByIdWorkflowRun(ctx.dbKey, {
        id: pointer.runId,
      });
      if (getError) {
        console.error(getError.message);
        process.exitCode = 1;
        return;
      }
      await updateStatusAndStepWorkflowRun(ctx.dbKey, {
        id: pointer.runId,
        status: "pending",
        current_step_index: stepIndex,
        now: new Date(),
      });
      console.log(`Run ${run.id} now at step ${stepIndex}.`);
    });
}
