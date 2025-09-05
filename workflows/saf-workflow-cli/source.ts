import type { Command } from "commander";
import { addNewLinesToString } from "@saflib/utils";
import { getGitHubUrl } from "@saflib/dev-tools";
import type { WorkflowDefinition } from "../core/types.ts";

export const addSourceCommand = (
  program: Command,
  workflows: WorkflowDefinition[],
) => {
  const sourceProgram = program
    .command("source")
    .description(addNewLinesToString("Print the GitHub url for a workflow."));

  workflows.forEach((workflow) => {
    let chain = sourceProgram
      .command(workflow.id)
      .description(workflow.description);
    chain.action(async () => {
      await printSourceUrl(workflow);
    });
  });
};

export const printSourceUrl = async (workflow: WorkflowDefinition) => {
  const absolutePath = workflow.sourceUrl.replace("file://", "");
  const sourceUrl = getGitHubUrl(absolutePath);
  console.log(sourceUrl);
};
