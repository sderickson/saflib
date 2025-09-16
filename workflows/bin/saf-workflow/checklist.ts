import type { Command } from "commander";
import { checklistToString } from "../../core/utils.ts";
import type { WorkflowDefinition } from "../../core/types.ts";
import { addNewLinesToString } from "../../strings.ts";
import { runWorkflow, loadWorkflowDefinition } from "./shared/utils.ts";

export const addChecklistCommand = (
  program: Command,
  workflows: WorkflowDefinition[],
) => {
  program
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
        workflows,
      );
      await printChecklist(workflowDefinition);
    });
};

export const printChecklist = async (Workflow: WorkflowDefinition) => {
  const workflow = await runWorkflow(Workflow, "dry");
  console.log(
    checklistToString(
      workflow.checklist.subitems || [{ description: "No checklist output" }],
    ),
  );
};
