import type { Command } from "commander";
import type { WorkflowDefinition } from "../../core/types.ts";
import { addNewLinesToString } from "../../strings.ts";
import { loadWorkflow } from "./shared/file-io.ts";
import { getWorkflowLogger } from "../../core/store.ts";

export const addStatusCommand = (
  program: Command,
  workflows: WorkflowDefinition[],
) => {
  program
    .command("status")
    .description(
      addNewLinesToString("Show the status of the current workflow."),
    )
    .action(async () => {
      const workflow = await loadWorkflow(workflows);
      const log = getWorkflowLogger();
      if (!workflow) {
        log.error("No workflow found");
        process.exit(1);
      }
      await workflow.printStatus();
    });
};
