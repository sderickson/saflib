import type { Command } from "commander";
import { saveWorkflow } from "../file-io.ts";
import { addNewLinesToString } from "@saflib/utils";
import { type WorkflowMeta } from "../workflow.ts";

export const addKickoffCommand = (
  program: Command,
  workflows: WorkflowMeta[],
) => {
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
      chain = chain.argument(arg.name, arg.description);
    });
    chain.action(async (...args) => await kickoffWorkflow(workflowMeta, args));
  });
};

const kickoffWorkflow = async (workflowMeta: WorkflowMeta, args: string[]) => {
  const { Workflow, cliArguments } = workflowMeta;
  const workflow = new Workflow();
  const result = await workflow.init(
    { dryRun: false },
    ...args.slice(0, cliArguments.length),
  );
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  await workflow.kickoff();
  saveWorkflow(workflow);
};
