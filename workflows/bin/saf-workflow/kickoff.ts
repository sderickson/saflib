import { type Command, Option } from "commander";
import { addNewLinesToString } from "../../strings.ts";
import type {
  WorkflowDefinition,
  WorkflowArgument,
  WorkflowRunMode,
} from "../../core/types.ts";
import { runWorkflow } from "./shared/utils.ts";
import { getWorkflowLogger } from "../../core/store.ts";
import { loadWorkflowDefinitionFromFile } from "./shared/file-io.ts";
import { resolve } from "node:path";

export const addKickoffCommand = (
  program: Command,
  workflows: WorkflowDefinition[],
) => {
  const runModeOption = new Option(
    "-r, --run <mode>",
    'Use Cursor agent instead of printing prompts. Currently only "cursor" is supported.',
  );
  const kickoffProgram = program
    .command("kickoff")
    .description(
      addNewLinesToString(
        "Kick off a workflow. Takes a workflow name and then any arguments for the workflow. Names should be kebab-case, and paths should be ./relative/to/package/root.ts. All commands should be run in a folder with a package.json; the package the workflow is acting on. Example:\n\nnpm exec saf-workflow kickoff add-tests ./path/to/file.ts",
      ),
    );

  workflows.sort((a, b) => a.id.localeCompare(b.id));

  workflows.forEach((workflow) => {
    let chain = kickoffProgram
      .command(workflow.id)
      .description(workflow.description)
      .addOption(runModeOption);
    workflow.input.forEach((arg: WorkflowArgument) => {
      chain = chain.argument(arg.name, arg.description);
    });
    chain.action(async (...args) => {
      const commandArgs = args.slice(0, workflow.input.length);
      const runMode = args[workflow.input.length].run;
      if (runMode && runMode !== "cursor") {
        throw new Error(`Unsupported run mode: ${runMode}`);
      }
      const givenRunMode = runMode === "cursor" ? "run" : runMode;
      await runWorkflow({
        definition: workflow,
        runMode: givenRunMode,
        args: commandArgs,
      });
    });
  });

  kickoffProgram
    .description(
      addNewLinesToString(
        "Kick off a workflow from a file path. That path should export a definition as its default export.",
      ),
    )
    .argument("<path>", "Path to the workflow file")
    .argument("[args...]", "Arguments for the workflow")
    .addOption(runModeOption)
    .action(
      async (filePath: string, args: string[], options: { run?: string }) => {
        const runMode = options.run;
        if (runMode && runMode !== "cursor") {
          throw new Error(`Unsupported run mode: ${runMode}`);
        }
        const givenRunMode: WorkflowRunMode =
          runMode === "cursor" ? "run" : "print";

        const log = getWorkflowLogger();

        const resolvedPath = resolve(process.cwd(), filePath);
        const workflowDefinition =
          await loadWorkflowDefinitionFromFile(resolvedPath);
        if (!workflowDefinition) {
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
          args,
        });
      },
    );
};
