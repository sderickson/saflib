import { Option } from "commander";
import { createRun, type AgentCli, type AgentConfig } from "@saflib/new-workflows";
import type { CliContext } from "../types.ts";
import { parseNamedArgs } from "../args.ts";
import { loadWorkflowDefinition } from "@saflib/new-workflows";
import { runAdvanceLoop } from "../advance-loop.ts";
import { reportOutcome } from "../report-outcome.ts";
import { writeRunPointer } from "../run-pointer.ts";
import { cliCwd } from "../cli-cwd.ts";

const RUN_VALUE_TO_CLI: Record<string, AgentCli> = {
  cursor: "cursor-agent",
  claude: "claude-agent",
  mock: "mock-agent",
};

function parseAgent(run: string | undefined): AgentConfig | undefined {
  if (!run) return undefined;
  const cli = RUN_VALUE_TO_CLI[run];
  if (!cli) {
    throw new Error(
      `Unsupported --run value "${run}" (expected one of: ${Object.keys(RUN_VALUE_TO_CLI).join(", ")})`,
    );
  }
  return { cli };
}

export function addKickoffCommand(ctx: CliContext): void {
  const runOption = new Option(
    "-r, --run <mode>",
    'Directly command an agent instead of printing prompts. "cursor", "claude", or "mock".',
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
      const cwd = cliCwd();
      const definition = await loadWorkflowDefinition(idOrPath, ctx.registry, { cwd });
      const input = parseNamedArgs(args, definition.inputSchema);
      const agentConfig = parseAgent(options.run);

      const runId = await createRun(ctx.dbKey, definition, {
        input,
        cwd,
        mode: agentConfig ? "run" : "print",
        agentConfig,
        skipTodos: options.skipTodos,
      });
      writeRunPointer(cwd, { runId, idOrPath });
      console.log(`Started run ${runId} for ${definition.id}`);

      const outcome = await runAdvanceLoop(ctx.dbKey, definition, runId);
      reportOutcome(outcome);
    });
}
