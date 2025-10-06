import { addNewLinesToString } from "../../strings.ts";
import { getSourceUrl } from "../../core/store.ts";
import type { WorkflowDefinition } from "../../core/types.ts";
import type { WorkflowCommandOptions } from "./shared/types.ts";

export const addSourceCommand = (commandOptions: WorkflowCommandOptions) => {
  const sourceProgram = commandOptions.program
    .command("source")
    .description(addNewLinesToString("Print the GitHub url for a workflow."));

  commandOptions.workflows.forEach((workflow) => {
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
  const sourceUrl = getSourceUrl(absolutePath);
  console.log(sourceUrl);
};
