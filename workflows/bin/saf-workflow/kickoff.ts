import { Option } from "commander";
import { addNewLinesToString } from "../../strings.ts";
import type { WorkflowDefinition, WorkflowRunMode } from "../../core/types.ts";
import { runWorkflow } from "./shared/utils.ts";
import {
  createWorkflowLogger,
  setupWorkflowContext,
} from "../../core/store.ts";
import { loadWorkflowDefinitionFromFile } from "./shared/file-io.ts";
import { resolve } from "node:path";
import { logFile } from "../../core/agents/cursor-agent.ts";
import { writeFileSync } from "node:fs";
import type { WorkflowCommandOptions } from "./shared/types.ts";

export const addKickoffCommand = (commandOptions: WorkflowCommandOptions) => {
  const runModeOption = new Option(
    "-r, --run <mode>",
    'Directly command an agent instead of printing prompts. Currently only "cursor" is supported.',
  );
  commandOptions.program
    .command("kickoff")
    .description(
      addNewLinesToString(
        "Kick off a workflow. Takes a workflow name and then any arguments for the workflow. Names should be kebab-case, and paths should be ./relative/to/package/root.ts. All commands should be run in a folder with a package.json; the package the workflow is acting on. Example:\n\nnpm exec saf-workflow kickoff add-tests ./path/to/file.ts",
      ),
    )
    .argument("<path>", "Path to the workflow file")
    .argument("[args...]", "Arguments for the workflow")
    .addOption(runModeOption)
    .action(
      async (filePath: string, args: string[], options: { run?: string }) => {
        writeFileSync(logFile, "");
        const runMode = options.run;
        const givenRunMode = parseRunMode(runMode);

        const log = createWorkflowLogger({
          printToAgent: givenRunMode === "run",
          printToConsole: givenRunMode !== "run",
        });
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
            (w) => w.id === filePath,
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
            `- Parameters:   ${workflowDefinition.input.map((arg: any) => arg.name).join(", ")}`,
          );
        }

        // Check if enough arguments were provided
        const expectedArgs = workflowDefinition.input.length;
        const providedArgs = args.length;

        if (providedArgs < expectedArgs) {
          log.error(
            `Error: Expected ${expectedArgs} argument${expectedArgs === 1 ? "" : "s"}, but got ${providedArgs}`,
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
          agentConfig: {
            cli: "cursor-agent",
          },
          args,
        });
      },
    );
};

const parseRunMode = (runMode: string | undefined): WorkflowRunMode => {
  if (runMode && runMode !== "cursor") {
    throw new Error(`Unsupported run mode: ${runMode}`);
  }
  return runMode === "cursor" ? "run" : "print";
};
