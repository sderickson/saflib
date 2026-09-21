import type { CliContext } from "../types.ts";
import { loadWorkflowDefinition } from "@saflib/new-workflows";
import { runAdvanceLoop } from "../advance-loop.ts";
import { reportOutcome } from "../report-outcome.ts";
import { readRunPointer } from "../run-pointer.ts";
import { cliCwd } from "../cli-cwd.ts";

export function addNextCommand(ctx: CliContext): void {
  ctx.program
    .command("next")
    .description("Advance the current run (from .new-workflow-run.json) by one or more steps.")
    .action(async () => {
      const cwd = cliCwd();
      const pointer = readRunPointer(cwd);
      if (!pointer) {
        console.error("No run found for this directory. Run 'new-workflow kickoff' first.");
        process.exitCode = 1;
        return;
      }
      const definition = await loadWorkflowDefinition(pointer.idOrPath, ctx.registry, { cwd });
      const outcome = await runAdvanceLoop(ctx.dbKey, definition, pointer.runId);
      reportOutcome(outcome);
    });
}
