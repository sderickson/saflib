import {
  loadPlanStatusContents,
  loadWorkflow,
  saveWorkflow,
} from "./shared/file-io.ts";
import { addNewLinesToString } from "../../strings.ts";
import {
  createWorkflowLogger,
  setupWorkflowContext,
} from "../../core/store.ts";
import { handlePrompt } from "../../core/prompt.ts";
import type { WorkflowBlob, WorkflowCommandOptions } from "./shared/types.ts";

export const addNextCommand = (commandOptions: WorkflowCommandOptions) => {
  commandOptions.program
    .command("next")
    .description(
      addNewLinesToString(
        "Try to go to the next step of the current workflow.",
      ),
    )
    .option("-m, --message <message>", "Message to add to the workflow")
    .action(async (options: { message?: string }) => {
      const contents = loadPlanStatusContents();
      if (!contents) {
        console.error("No contents found");
        process.exit(1);
      }
      const blob = JSON.parse(contents) as WorkflowBlob;
      if (!blob.snapshotState?.context) {
        console.error("No context found");
        process.exit(1);
      }
      const runMode = blob.snapshotState?.context?.runMode;
      const log = createWorkflowLogger({
        // printToAgent: runMode === "run",
      });
      setupWorkflowContext({
        logger: log,
        getSourceUrl: commandOptions.getSourceUrl,
      });

      if (options.message) {
        if (runMode !== "run") {
          log.error("Message can only be added to workflows in run mode");
          process.exit(1);
        }
        await handlePrompt({
          msg: options.message,
          context: blob.snapshotState?.context,
        });
      }

      const workflow = await loadWorkflow(commandOptions.workflows);
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
