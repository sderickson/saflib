import type { ChecklistItem } from "../types.ts";
import type { WorkflowMeta } from "../workflow.ts";

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

  console.log(`\nChecklist for ${name}:\n`);
  printChecklistRecursively(workflow.getChecklist());
  console.log();
};

const printChecklistRecursively = (checklist: ChecklistItem[], prefix = "") => {
  checklist.forEach((item) => {
    console.log(`${prefix}* ${item.description}`);
    if (item.subitems) {
      printChecklistRecursively(item.subitems, `${prefix}  `);
    }
  });
};
