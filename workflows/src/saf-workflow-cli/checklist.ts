import type { Command } from "commander";
import { printChecklistRecursively } from "../utils.ts";
import { XStateWorkflow, type ConcreteWorkflow } from "../workflow.ts";
import { addNewLinesToString } from "@saflib/utils";

export const addChecklistCommand = (
  program: Command,
  workflows: ConcreteWorkflow[],
) => {
  const checklistProgram = program
    .command("checklist")
    .description(addNewLinesToString("Show the checklist for a workflow."));

  const supportedWorkflows = workflows.filter((workflow) => {
    return new workflow() instanceof XStateWorkflow;
  });

  supportedWorkflows.forEach((workflow) => {
    const stubWorkflow = new workflow();
    let chain = checklistProgram
      .command(stubWorkflow.name)
      .description(stubWorkflow.description);
    chain.action(async () => {
      await printChecklist(workflow);
    });
  });
};

export const printChecklist = async (Workflow: ConcreteWorkflow) => {
  const workflow = new Workflow();
  const cliArguments = workflow.cliArguments;
  const exampleArgs = cliArguments.map(
    (arg) => arg.exampleValue || "example-value-missing",
  );
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
      throw new Error(`Workflow is stuck on state ${currentStateName}.`);
    }
    lastStateName = currentStateName;
  }

  printChecklistRecursively(workflow.getChecklist());
};
