import type { Command } from "commander";
import { saveWorkflow } from "./file-io.ts";
import { addNewLinesToString } from "../../strings.ts";
import type { WorkflowDefinition, WorkflowArgument } from "../../core/types.ts";
import { XStateWorkflowRunner } from "./workflow.ts";

export const addKickoffCommand = (
  program: Command,
  workflows: WorkflowDefinition[]
) => {
  const kickoffProgram = program
    .command("kickoff")
    .description(
      addNewLinesToString(
        "Kick off a workflow. Takes a workflow name and then any arguments for the workflow. Names should be kebab-case, and paths should be ./relative/to/package/root.ts. All commands should be run in a folder with a package.json; the package the workflow is acting on. Example:\n\nnpm exec saf-workflow kickoff add-tests ./path/to/file.ts"
      )
    );

  workflows.sort((a, b) => a.id.localeCompare(b.id));

  workflows.forEach((workflow) => {
    let chain = kickoffProgram
      .command(workflow.id)
      .description(workflow.description);
    workflow.input.forEach((arg: WorkflowArgument) => {
      chain = chain.argument(arg.name, arg.description);
    });
    chain.action(async (...args) => await kickoffWorkflow(workflow, args));
  });
};

const kickoffWorkflow = async (
  Workflow: WorkflowDefinition,
  args: string[]
) => {
  const workflow = new XStateWorkflowRunner({
    definition: Workflow,
    args: args.slice(0, Workflow.input.length),
    dryRun: false,
  });
  await workflow.kickoff();
  console.log("--- To continue, run 'npm exec saf-workflow next' ---\n");
  saveWorkflow(workflow);
};
