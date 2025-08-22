import { Command } from "commander";
import type { WorkflowMeta } from "@saflib/workflows";
import { loadWorkflow, saveWorkflow } from "../file-io.ts";
import { addNewLinesToString } from "../utils.ts";
import { XStateWorkflow } from "../workflow.ts";
import { setupContext } from "./context.ts";
import { kickoffWorkflow } from "./kickoff.ts";
import { printChecklist } from "./checklist.ts";

export function runWorkflowCli(workflows: WorkflowMeta[]) {
  setupContext({ silentLogging: process.argv.includes("checklist") });

  const program = new Command()
    .name("saf-workflow")
    .description(
      addNewLinesToString(
        "Tool for agents to be given a series of prompts. For a list of available workflows, run:\n\nnpm exec saf-workflow help kickoff",
      ),
    );

  const kickoffProgram = program
    .command("kickoff")
    .description(
      addNewLinesToString(
        "Kick off a workflow. Takes a workflow name and then any arguments for the workflow. Names should be kebab-case, and paths should be ./relative/to/package/root.ts. All commands should be run in a folder with a package.json; the package the workflow is acting on. Example:\n\nnpm exec saf-workflow kickoff add-tests ./path/to/file.ts",
      ),
    );
  workflows.forEach((workflowMeta) => {
    let chain = kickoffProgram
      .command(workflowMeta.name)
      .description(workflowMeta.description);
    workflowMeta.cliArguments.forEach((arg) => {
      chain = chain.argument(arg.name, arg.description, arg.defaultValue);
    });
    chain.action(async (...args) => await kickoffWorkflow(workflowMeta, args));
  });

  program
    .command("status")
    .description(
      addNewLinesToString("Show the status of the current workflow."),
    )
    .action(async () => {
      const workflow = loadWorkflow(workflows);
      if (!workflow) {
        console.log("No workflow found");
        process.exit(1);
      }
      await workflow.printStatus();
    });

  program
    .command("next")
    .description(
      addNewLinesToString(
        "Try to go to the next step of the current workflow.",
      ),
    )
    .action(async () => {
      const workflow = loadWorkflow(workflows);
      if (!workflow) {
        console.log("No workflow found");
        process.exit(1);
      }
      await workflow.goToNextStep();
      saveWorkflow(workflow);
    });

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

  program.parse(process.argv);
}
