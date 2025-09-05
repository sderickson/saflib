import type { Command } from "commander";
import { checklistToString } from "../core/utils.ts";
import {
  XStateWorkflowRunner,
  type ConcreteWorkflowRunner,
} from "./workflow.ts";
import { addNewLinesToString } from "@saflib/utils";
import { dryRunWorkflow } from "./utils.ts";

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
  const workflow = await dryRunWorkflow(Workflow);
  console.log(checklistToString(workflow.checklist));
};
