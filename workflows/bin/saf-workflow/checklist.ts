import { checklistToString } from "../../core/utils.ts";
import type { WorkflowDefinition } from "../../core/types.ts";
import { addNewLinesToString } from "../../strings.ts";
import { runWorkflow, loadWorkflowDefinition } from "./shared/utils.ts";
import type { WorkflowCommandOptions } from "./shared/types.ts";

export const addChecklistCommand = (commandOptions: WorkflowCommandOptions) => {
  commandOptions.program
    .command("checklist")
    .description(
      addNewLinesToString(
        "Show the checklist for a workflow. Can be called with a workflow ID or a file path to a workflow definition.",
      ),
    )
    .argument("<workflowIdOrPath>", "Workflow ID or path to workflow file")
    .action(async (workflowIdOrPath: string) => {
      const workflowDefinition = await loadWorkflowDefinition(
        workflowIdOrPath,
        commandOptions.workflows,
      );
      await printChecklist(workflowDefinition);
    });
};

export const printChecklist = async (Workflow: WorkflowDefinition) => {
  const workflow = await runWorkflow({
    definition: Workflow,
    runMode: "dry",
  });
  console.log(
    checklistToString(
      workflow.output?.checklist.subitems || [
        { description: "No checklist output" },
      ],
    ),
  );
};
