import type { Command } from "commander";
import {
  loadPlanStatusContents,
  loadWorkflow,
  saveWorkflow,
} from "./shared/file-io.ts";
import { addNewLinesToString } from "../../strings.ts";
import type { WorkflowDefinition } from "../../core/types.ts";
import { getWorkflowLogger } from "../../core/store.ts";
import { executePrompt } from "../../core/prompt.ts";
import type { WorkflowBlob } from "./shared/types.ts";

export const addNextCommand = (
  program: Command,
  workflows: WorkflowDefinition[],
) => {
  program
    .command("next")
    .description(
      addNewLinesToString(
        "Try to go to the next step of the current workflow.",
      ),
    )
    .option("-m, --message <message>", "Message to add to the workflow")
    .action(async (options: { message?: string }) => {
      const log = getWorkflowLogger();

      if (options.message) {
        const contents = loadPlanStatusContents();
        if (!contents) {
          log.error("No contents found");
          process.exit(1);
        }
        const blob = JSON.parse(contents) as WorkflowBlob;
        const runMode = blob.snapshotState?.context?.runMode;
        if (runMode !== "run" && options.message) {
          log.error("Message can only be added to workflows in run mode");
          process.exit(1);
        }
        if (!blob.snapshotState?.context) {
          log.error("No context found");
          process.exit(1);
        }
        await executePrompt({
          msg: options.message,
          context: blob.snapshotState?.context,
        });
      }

      const workflow = await loadWorkflow(workflows);
      if (!workflow) {
        log.error("No workflow found");
        process.exit(1);
      }
      log.info(`Successfully loaded workflow ${workflow.definition.id}`);
      await workflow.goToNextStep();
      log.info(`Saving workflow ${workflow.definition.id}`);
      saveWorkflow(workflow);
    });
};
