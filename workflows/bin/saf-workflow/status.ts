import { addNewLinesToString } from "../../strings.ts";
import { loadWorkflow } from "./shared/file-io.ts";
import { getWorkflowLogger } from "../../core/store.ts";
import type { WorkflowCommandOptions } from "./shared/types.ts";

export const addStatusCommand = (commandOptions: WorkflowCommandOptions) => {
  commandOptions.program
    .command("status")
    .description(
      addNewLinesToString("Show the status of the current workflow."),
    )
    .action(async () => {
      const workflow = await loadWorkflow(commandOptions.workflows);
      const log = getWorkflowLogger();
      if (!workflow) {
        log.error("No workflow found");
        process.exit(1);
      }
      await workflow.printStatus();
    });
};
