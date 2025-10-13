import { addNewLinesToString } from "../../strings.ts";
import type { WorkflowArgument, WorkflowDefinition } from "../../core/types.ts";
import { runWorkflow, loadWorkflowDefinition } from "./shared/utils.ts";
import { checklistToString } from "../../core/utils.ts";
import type { WorkflowCommandOptions } from "./shared/types.ts";
import {
  createWorkflowLogger,
  setupWorkflowContext,
} from "../../core/store.ts";

export const addRunScriptsCommand = (
  commandOptions: WorkflowCommandOptions,
) => {
  commandOptions.program
    .command("run-scripts")
    .description(
      addNewLinesToString(
        "Run a workflow in script mode. Can be called with a workflow ID or a file path to a workflow definition.",
      ),
    )
    .argument("<workflowIdOrPath>", "Workflow ID or path to workflow file")
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
      await runWorkflowScript({
        definition: workflowDefinition,
        args:
          args.length > 0
            ? args
            : workflowDefinition.input.map(
                (input: WorkflowArgument) => input.exampleValue,
              ),
      });
    });
};

interface RunWorkflowScriptOptions {
  definition: WorkflowDefinition;
  args: string[];
}

export const runWorkflowScript = async (options: RunWorkflowScriptOptions) => {
  const { definition, args } = options;
  const workflow = await runWorkflow({
    definition,
    args,
    runMode: "script",
  });
  console.log("Workflow executed in script mode");
  if (workflow) {
    console.log(
      "Output:\n",
      checklistToString(workflow.checklist.subitems || []),
    );
  }
};
