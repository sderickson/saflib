import type { Command } from "commander";
import { loadWorkflow, saveWorkflow } from "./shared/file-io.ts";
import { addNewLinesToString } from "../../strings.ts";
import type { WorkflowDefinition } from "../../core/types.ts";
import { getWorkflowLogger } from "../../core/store.ts";

export const addNextCommand = (
  program: Command,
  workflows: WorkflowDefinition[]
) => {
  program
    .command("next")
    .description(
      addNewLinesToString("Try to go to the next step of the current workflow.")
    )
    .action(async () => {
      const log = getWorkflowLogger();
      const workflow = await loadWorkflow(workflows);
      if (!workflow) {
        log.error("No workflow found");
        process.exit(1);
      }
      log.info(`Successfully loaded workflow ${workflow.definition.id}`);
      await workflow.goToNextStep();
      log.info(`saving workflow ${workflow.definition.id}`);
      saveWorkflow(workflow);
    });
};
