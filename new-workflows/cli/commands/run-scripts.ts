import { createRun } from "@saflib/new-workflows";
import type { CliContext } from "../types.ts";
import { parseNamedArgs } from "../args.ts";
import { loadWorkflowDefinition } from "@saflib/new-workflows";
import { runAdvanceLoop } from "../advance-loop.ts";
import { reportOutcome } from "../report-outcome.ts";
import { cliCwd } from "../cli-cwd.ts";

export function addRunScriptsCommand(ctx: CliContext): void {
  ctx.program
    .command("run-scripts")
    .allowUnknownOption(true)
    .description("Run a workflow in script mode: mechanical steps only, no prompts.")
    .argument("<id-or-path>", "Workflow id, or path to a workflow file")
    .argument("[args...]", "Named args for the workflow (--key=value)")
    .action(async (idOrPath: string, args: string[]) => {
      const cwd = cliCwd();
      const definition = await loadWorkflowDefinition(idOrPath, ctx.registry, { cwd });
      const input = parseNamedArgs(args, definition.inputSchema);

      const runId = await createRun(ctx.dbKey, definition, {
        input,
        cwd,
        mode: "script",
      });

      const outcome = await runAdvanceLoop(ctx.dbKey, definition, runId);
      reportOutcome(outcome);
      if (outcome.status === "error") process.exitCode = 1;
    });
}
