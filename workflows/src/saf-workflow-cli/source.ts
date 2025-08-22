import type { Command } from "commander";
import { type WorkflowMeta } from "../workflow.ts";
import { addNewLinesToString, getGitHubUrl } from "../utils.ts";

export const addSourceCommand = (
  program: Command,
  workflows: WorkflowMeta[],
) => {
  const sourceProgram = program
    .command("source")
    .description(addNewLinesToString("Print the GitHub url for a workflow."));

  workflows.forEach((workflowMeta) => {
    let chain = sourceProgram
      .command(workflowMeta.name)
      .description(workflowMeta.description);
    chain.action(async () => {
      await printSourceUrl(workflowMeta);
    });
  });
};

export const printSourceUrl = async (workflowMeta: WorkflowMeta) => {
  const { Workflow } = workflowMeta;
  const workflow = new Workflow();
  const absolutePath = workflow.sourceUrl.replace("file://", "");
  const sourceUrl = getGitHubUrl(absolutePath);
  console.log(sourceUrl);
};
