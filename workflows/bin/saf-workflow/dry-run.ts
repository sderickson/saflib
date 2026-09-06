import { addNewLinesToString } from "../../strings.ts";
import { runWorkflow, loadWorkflowDefinition, validateArguments } from "./shared/utils.ts";
import type { WorkflowCommandOptions } from "./shared/types.ts";
import {
  createWorkflowLogger,
  setupWorkflowContext,
} from "../../core/store.ts";

export const addDryRunCommand = (commandOptions: WorkflowCommandOptions) => {
  commandOptions.program
    .command("dry-run")
    .allowUnknownOption(true)
    .description(
      addNewLinesToString(
        "Dry run a workflow. Runs the workflow with the given input, but does not make any file changes at all.",
      ),
    )
    .argument("<path-or-id>", "Workflow ID or path to workflow file")
    .argument("[args...]", "Arguments for the workflow")
    .action(async (workflowIdOrPath: string, args: string[]) => {
      const log = createWorkflowLogger();
      setupWorkflowContext({
        logger: log,
        getSourceUrl: commandOptions.getSourceUrl,
      });
      const workflowDefinition = await loadWorkflowDefinition(
        workflowIdOrPath,
        commandOptions.workflows,
      );

      const parsedArgs = validateArguments(args, workflowDefinition);

      // Run the workflow
      await runWorkflow({
        definition: workflowDefinition,
        runMode: "dry",
        args: parsedArgs,
      });
      console.log("Workflow dry-run completed successfully");
    });
};
