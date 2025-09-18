import type { Command } from "commander";
import { addNewLinesToString } from "../../strings.ts";
import type { WorkflowDefinition } from "../../core/types.ts";
import { runWorkflow, loadWorkflowDefinition } from "./shared/utils.ts";
import { checklistToString } from "../../core/utils.ts";

export const addRunScriptsCommand = (
  program: Command,
  workflows: WorkflowDefinition[],
) => {
  program
    .command("run-scripts")
    .description(
      addNewLinesToString(
        "Run a workflow in script mode. Can be called with a workflow ID or a file path to a workflow definition.",
      ),
    )
    .argument("<workflowIdOrPath>", "Workflow ID or path to workflow file")
    .argument("[args...]", "Arguments for the workflow")
    .action(async (workflowIdOrPath: string, args: string[]) => {
      const workflowDefinition = await loadWorkflowDefinition(
        workflowIdOrPath,
        workflows,
      );
      await runWorkflowScript({
        definition: workflowDefinition,
        args,
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
  console.log(
    "Output:\n",
    checklistToString(workflow.checklist.subitems || []),
  );
};
