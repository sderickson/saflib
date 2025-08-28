import type { Command } from "commander";
import { saveWorkflow } from "../file-io.ts";
import { addNewLinesToString } from "@saflib/utils";
import { type ConcreteWorkflow } from "../workflow.ts";

export const addKickoffCommand = (
  program: Command,
  workflows: ConcreteWorkflow[],
) => {
  const kickoffProgram = program
    .command("kickoff")
    .description(
      addNewLinesToString(
        "Kick off a workflow. Takes a workflow name and then any arguments for the workflow. Names should be kebab-case, and paths should be ./relative/to/package/root.ts. All commands should be run in a folder with a package.json; the package the workflow is acting on. Example:\n\nnpm exec saf-workflow kickoff add-tests ./path/to/file.ts",
      ),
    );
  workflows.forEach((workflow) => {
    const stubWorkflow = new workflow();
    let chain = kickoffProgram
      .command(stubWorkflow.name)
      .description(stubWorkflow.description);
    stubWorkflow.cliArguments.forEach((arg) => {
      chain = chain.argument(arg.name, arg.description);
    });
    chain.action(async (...args) => await kickoffWorkflow(workflow, args));
  });
};

const kickoffWorkflow = async (Workflow: ConcreteWorkflow, args: string[]) => {
  const workflow = new Workflow();
  const result = await workflow.init(
    { dryRun: false },
    ...args.slice(0, workflow.cliArguments.length),
  );
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  await workflow.kickoff();
  saveWorkflow(workflow);
};
