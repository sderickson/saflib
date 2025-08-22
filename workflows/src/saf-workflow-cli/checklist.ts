import type { Command } from "commander";
import type { ChecklistItem } from "../types.ts";
import { XStateWorkflow, type WorkflowMeta } from "../workflow.ts";
import { addNewLinesToString } from "../utils.ts";

export const addChecklistCommand = (
  program: Command,
  workflows: WorkflowMeta[],
) => {
  const checklistProgram = program
    .command("checklist")
    .description(addNewLinesToString("Show the checklist for a workflow."));

  const supportedWorkflows = workflows
    .filter(({ cliArguments }) =>
      cliArguments.every((arg) => arg.exampleValue !== undefined),
    )
    .filter(({ Workflow }) => {
      return new Workflow() instanceof XStateWorkflow;
    });

  supportedWorkflows.forEach((workflowMeta) => {
    let chain = checklistProgram
      .command(workflowMeta.name)
      .description(workflowMeta.description);
    chain.action(async () => {
      await printChecklist(workflowMeta);
    });
  });
};

export const printChecklist = async (workflowMeta: WorkflowMeta) => {
  const { Workflow, cliArguments, name } = workflowMeta;
  const workflow = new Workflow();
  const exampleArgs = cliArguments.map((arg) => arg.exampleValue);
  const result = await workflow.init({ dryRun: true }, ...exampleArgs);
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  await workflow.kickoff();
  let lastStateName = workflow.getCurrentStateName();

  while (!workflow.done()) {
    await workflow.goToNextStep();
    const error = workflow.getError();
    if (error) {
      console.error("Workflow errored", error);
      process.exit(1);
    }
    const currentStateName = workflow.getCurrentStateName();
    if (currentStateName === lastStateName) {
      throw new Error("Workflow is stuck");
    }
    lastStateName = currentStateName;
  }

  printChecklistRecursively(workflow.getChecklist());
};

const printChecklistRecursively = (checklist: ChecklistItem[], prefix = "") => {
  checklist.forEach((item) => {
    console.log(`${prefix}* ${item.description}`);
    if (item.subitems) {
      printChecklistRecursively(item.subitems, `${prefix}  `);
    }
  });
};
