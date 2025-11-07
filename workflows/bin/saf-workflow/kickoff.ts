import { Option } from "commander";
import { addNewLinesToString } from "../../strings.ts";
import type { AgentConfig, WorkflowDefinition, WorkflowRunMode } from "../../core/types.ts";
import { runWorkflow } from "./shared/utils.ts";
import {
  createWorkflowLogger,
  setupWorkflowContext,
} from "../../core/store.ts";
import { loadWorkflowDefinitionFromFile } from "./shared/file-io.ts";
import { resolve } from "node:path";
import { logFile } from "../../core/agents/log.ts";
import { addPendingMessage } from "../../core/agents/message.ts";
import { writeFileSync } from "node:fs";
import type { WorkflowCommandOptions } from "./shared/types.ts";

export const addKickoffCommand = (commandOptions: WorkflowCommandOptions) => {
  const runModeOption = new Option(
    "-r, --run <mode>",
    'Directly command an agent instead of printing prompts. Currently only "cursor" and "mock" are supported.'
  );
  const versionControlOption = new Option(
    "-v, --version-control <mode>",
    'Manage version control for the workflow. Currently only "git" is supported.'
  );
  const skipTodosOption = new Option(
    "-s, --skip-todos",
    'Skip TODOs in the workflow. This is useful if you want to run the workflow without having to complete TODOs.'
  );
  commandOptions.program
    .command("kickoff")
    .description(
      addNewLinesToString(
        "Kick off a workflow. Takes a workflow name and then any arguments for the workflow. Names should be kebab-case, and paths should be ./relative/to/package/root.ts. All commands should be run in a folder with a package.json; the package the workflow is acting on. Example:\n\nnpm exec saf-workflow kickoff add-tests ./path/to/file.ts"
      )
    )
    .argument("<path>", "Path to the workflow file")
    .argument("[args...]", "Arguments for the workflow")
    .option("-m, --message <message>", "Message to add to the workflow")
    .addOption(runModeOption)
    .addOption(versionControlOption)
    .addOption(skipTodosOption)
    .action(
      async (
        filePath: string,
        args: string[],
        options: { run?: string; message?: string; versionControl?: string; skipTodos?: boolean }
      ) => {
        const runMode = options.run;
        if (runMode) {
          writeFileSync(logFile, "");
        }
        const { runMode: givenRunMode, agentConfig } = parseRun(runMode);
        const skipTodos = options.skipTodos;
        const log = createWorkflowLogger({
          // printToAgent: givenRunMode === "run",
          // printToConsole: givenRunMode !== "run",
        });
        if (givenRunMode === "run") {
          addPendingMessage(
            "You are going through a well-defined developer workflow specific to this codebase and project. You will receive logs and prompts, please follow them to the best of your ability.\n"
          );
          if (options.message) {
            addPendingMessage(`${options.message}\n`);
          }
        }
        setupWorkflowContext({
          logger: log,
          getSourceUrl: commandOptions.getSourceUrl,
        });

        let workflowDefinition: WorkflowDefinition | undefined;
        if (filePath.startsWith("./") || filePath.endsWith(".ts")) {
          const resolvedPath = resolve(process.cwd(), filePath);
          workflowDefinition =
            await loadWorkflowDefinitionFromFile(resolvedPath);
        } else {
          workflowDefinition = commandOptions.workflows.find(
            (w) => w.id === filePath
          );
        }
        if (!workflowDefinition) {
          console.log("Workflow definition not found");
          process.exit(1);
        }

        log.info(`Workflow sucessfully loaded`);
        log.info(`- Workflow:     ${workflowDefinition.id}`);
        log.info(`- Description:  ${workflowDefinition.description}`);
        if (workflowDefinition.input.length > 0) {
          log.info(
            `- Parameters:   ${workflowDefinition.input.map((arg: any) => arg.name).join(", ")}`
          );
        }

        // Check if enough arguments were provided
        const expectedArgs = workflowDefinition.input.length;
        const providedArgs = args.length;

        if (providedArgs < expectedArgs) {
          log.error(
            `Error: Expected ${expectedArgs} argument${expectedArgs === 1 ? "" : "s"}, but got ${providedArgs}`
          );
          process.exit(1);
        }

        if (args.length > 0) {
          log.info(`- Arguments:    ${args.join(", ")}`);
        }

        // Kick off the workflow
        await runWorkflow({
          definition: workflowDefinition,
          runMode: givenRunMode,
          agentConfig,
          args,
          skipTodos,
        });
      }
    );
};

interface RunReturn {
  runMode: WorkflowRunMode;
  agentConfig?: AgentConfig;
}

const parseRun = (runMode: string | undefined): RunReturn => {
  switch (runMode) {
    case "cursor":
      return { runMode: "run", agentConfig: { cli: "cursor-agent" } };
    case "mock":
      return { runMode: "run", agentConfig: { cli: "mock-agent" } };
    case undefined:
      return { runMode: "print" };
    default:
      throw new Error(`Unsupported run mode: ${runMode}`);
  }
};
