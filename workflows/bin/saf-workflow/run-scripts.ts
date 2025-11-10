import { addNewLinesToString } from "../../strings.ts";
import type { WorkflowArgument, WorkflowDefinition } from "../../core/types.ts";
import { runWorkflow, loadWorkflowDefinition } from "./shared/utils.ts";
import { checklistToString } from "../../core/utils.ts";
import type { WorkflowCommandOptions } from "./shared/types.ts";
import {
  createWorkflowLogger,
  setupWorkflowContext,
} from "../../core/store.ts";
import type { Snapshot } from "xstate";

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
      const result = await runWorkflowScript({
        definition: workflowDefinition,
        args:
          args.length > 0
            ? args
            : workflowDefinition.input.map(
                (input: WorkflowArgument) => input.exampleValue,
              ),
      });
      if (!result.success) {
        console.error("Workflow did not complete successfully");
        // if (result.state) {
        //   console.error("State:", JSON.stringify(result.state, null, 2));
        // }
        process.exit(1);
      }
    });
};

interface RunWorkflowScriptOptions {
  definition: WorkflowDefinition;
  args: string[];
}

interface RunWorkflowScriptResult {
  success: boolean;
  state: Snapshot<any> | undefined;
}

export const runWorkflowScript = async (
  options: RunWorkflowScriptOptions,
): Promise<RunWorkflowScriptResult> => {
  const { definition, args } = options;
  const { output, state } = await runWorkflow({
    definition,
    args,
    runMode: "script",
  });
  console.log("Workflow executed in script mode");
  if (output) {
    console.log(
      "Output:\n",
      checklistToString(output.checklist.subitems || []),
    );
  }
  // no output means the workflow did not complete successfully
  return {
    success: !!output,
    state,
  };
};
