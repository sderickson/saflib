import type { Command } from "commander";
import { checklistToString } from "../utils.ts";
import { XStateWorkflowRunner, type ConcreteWorkflowRunner } from "../workflow.ts";
import { addNewLinesToString } from "@saflib/utils";

export const addChecklistCommand = (
  program: Command,
  workflows: ConcreteWorkflowRunner[],
) => {
  const checklistProgram = program
    .command("checklist")
    .description(addNewLinesToString("Show the checklist for a workflow."));

  const supportedWorkflows = workflows.filter((workflow) => {
    return new workflow() instanceof XStateWorkflowRunner;
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

export const printChecklist = async (Workflow: ConcreteWorkflowRunner) => {
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
      throw new Error(
        `Workflow ${workflow.name} is stuck on state ${currentStateName}.`,
      );
    }
    lastStateName = currentStateName;
  }

  console.log(checklistToString(workflow.getChecklist()));
};
