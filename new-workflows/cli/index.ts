import { Command } from "commander";
import type { DbKey } from "@saflib/drizzle";
import type { WorkflowDefinition } from "@saflib/new-workflows";
import type { CliContext } from "./types.ts";
import { addListCommand } from "./commands/list.ts";
import { addKickoffCommand } from "./commands/kickoff.ts";
import { addDryRunCommand } from "./commands/dry-run.ts";
import { addRunScriptsCommand } from "./commands/run-scripts.ts";
import { addNextCommand } from "./commands/next.ts";
import { addStatusCommand } from "./commands/status.ts";
import { addGotoCommand } from "./commands/goto.ts";

export { parseNamedArgs } from "./args.ts";
export { loadWorkflowDefinition } from "@saflib/new-workflows";
export { runAdvanceLoop } from "./advance-loop.ts";

/**
 * Given a registry of workflow definitions and a connected db key, runs a
 * CLI for kicking off and resuming runs. Mirrors `runWorkflowCli`
 * (`workflows/bin/saf-workflow/index.ts`) — a separate package (or this
 * package's own `bin/`) supplies the registry and calls this.
 */
export async function runNewWorkflowCli(
  registry: WorkflowDefinition<any, any>[],
  dbKey: DbKey,
): Promise<void> {
  const program = new Command()
    .name("new-workflow")
    .description("Tool for running sqlite-backed new-workflows engine workflows.");

  const ctx: CliContext = { program, registry, dbKey };

  addListCommand(ctx);
  addKickoffCommand(ctx);
  addDryRunCommand(ctx);
  addRunScriptsCommand(ctx);
  addNextCommand(ctx);
  addStatusCommand(ctx);
  addGotoCommand(ctx);

  await program.parseAsync(process.argv);
}
