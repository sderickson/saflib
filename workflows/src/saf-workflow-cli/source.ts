import type { Command } from "commander";
import { type ConcreteWorkflow } from "../workflow.ts";
import { addNewLinesToString } from "@saflib/utils";
import { getGitHubUrl } from "@saflib/dev-tools";

export const addSourceCommand = (
  program: Command,
  workflows: ConcreteWorkflow[],
) => {
  const sourceProgram = program
    .command("source")
    .description(addNewLinesToString("Print the GitHub url for a workflow."));

  workflows.forEach((workflow) => {
    const stubWorkflow = new workflow();
    let chain = sourceProgram
      .command(stubWorkflow.name)
      .description(stubWorkflow.description);
    chain.action(async () => {
      await printSourceUrl(workflow);
    });
  });
};

export const printSourceUrl = async (workflow: ConcreteWorkflow) => {
  const stubWorkflow = new workflow();
  const absolutePath = stubWorkflow.sourceUrl.replace("file://", "");
  const sourceUrl = getGitHubUrl(absolutePath);
  console.log(sourceUrl);
};
