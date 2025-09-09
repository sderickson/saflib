import type { Command } from "commander";
import { checklistToString } from "../../core/utils.ts";
import type { WorkflowDefinition } from "../../core/types.ts";
import { addNewLinesToString } from "../../strings.ts";
import { dryRunWorkflow } from "./shared/utils.ts";

export const addChecklistCommand = (
  program: Command,
  workflows: WorkflowDefinition[]
) => {
  const checklistProgram = program
    .command("checklist")
    .description(addNewLinesToString("Show the checklist for a workflow."));

  workflows.forEach((workflow) => {
    let chain = checklistProgram
      .command(workflow.id)
      .description(workflow.description);
    chain.action(async () => {
      await printChecklist(workflow);
    });
  });
};

export const printChecklist = async (Workflow: WorkflowDefinition) => {
  const workflow = await dryRunWorkflow(Workflow);
  console.log(
    checklistToString(
      workflow.checklist.subitems || [{ description: "No checklist output" }]
    )
  );
};
