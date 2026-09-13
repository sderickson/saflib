import { Option } from "commander";
import { createRun, type AgentCli, type AgentConfig } from "@saflib/new-workflows";
import type { CliContext } from "../types.ts";
import { parseNamedArgs } from "../args.ts";
import { loadWorkflowDefinition } from "../lookup.ts";
import { runAdvanceLoop } from "../advance-loop.ts";
import { reportOutcome } from "../report-outcome.ts";
import { writeRunPointer } from "../run-pointer.ts";

function parseAgent(run: string | undefined): AgentConfig | undefined {
  if (!run) return undefined;
  const cli: AgentCli | undefined = run === "cursor" ? "cursor-agent" : run === "mock" ? "mock-agent" : undefined;
  if (!cli) throw new Error(`Unsupported --run value "${run}" (expected "cursor" or "mock")`);
  return { cli };
}

export function addKickoffCommand(ctx: CliContext): void {
  const runOption = new Option(
    "-r, --run <mode>",
    'Directly command an agent instead of printing prompts. "cursor" or "mock".',
  );
  const skipTodosOption = new Option("-s, --skip-todos", "Skip TODO checks in update steps.");

  ctx.program
    .command("kickoff")
    .allowUnknownOption(true)
    .description("Kick off a workflow. Args are named: --key=value.")
    .argument("<id-or-path>", "Workflow id, or path to a workflow file")
    .argument("[args...]", "Named args for the workflow (--key=value)")
    .addOption(runOption)
    .addOption(skipTodosOption)
    .action(async (idOrPath: string, args: string[], options: { run?: string; skipTodos?: boolean }) => {
      const definition = await loadWorkflowDefinition(idOrPath, ctx.registry);
      const input = parseNamedArgs(args, definition.inputSchema);
      const agentConfig = parseAgent(options.run);

      const runId = await createRun(ctx.dbKey, definition, {
        input,
        cwd: process.cwd(),
        mode: agentConfig ? "run" : "print",
        agentConfig,
        skipTodos: options.skipTodos,
      });
      writeRunPointer(process.cwd(), { runId, idOrPath });
      console.log(`Started run ${runId} for ${definition.id}`);

      const outcome = await runAdvanceLoop(ctx.dbKey, definition, runId);
      reportOutcome(outcome);
    });
}
