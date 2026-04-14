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
import type { WorkflowBlob, WorkflowCommandOptions } from "./shared/types.ts";

export const addGotoCommand = (commandOptions: WorkflowCommandOptions) => {
  commandOptions.program
    .command("goto [step]")
    .description(
      addNewLinesToString(
        "Jump to a specific step of the current workflow by step number. If no step is given, lists available steps.",
      ),
    )
    .action(async (step?: string) => {
      const contents = loadPlanStatusContents();
      if (!contents) {
        console.error("No workflow status found");
        process.exit(1);
      }
      const blob = JSON.parse(contents) as WorkflowBlob;
      if (!blob.snapshotState?.context) {
        console.error("No context found in workflow status");
        process.exit(1);
      }
      const log = createWorkflowLogger({});
      setupWorkflowContext({
        logger: log,
        getSourceUrl: commandOptions.getSourceUrl,
      });

      const workflow = await loadWorkflow(commandOptions.workflows);
      if (!workflow) {
        log.error("No workflow found");
        process.exit(1);
      }

      const steps = workflow.listSteps();

      if (step === undefined) {
        console.log("\nWorkflow steps:");
        steps.forEach(({ index, name }) => {
          console.log(`  ${index}: ${name}`);
        });
        console.log(
          "\nRun with a step number to jump to that step, e.g.: saf-workflow goto 2",
        );
        return;
      }

      const stepIndex = parseInt(step, 10);
      if (isNaN(stepIndex) || stepIndex < 0 || stepIndex >= steps.length) {
        log.error(
          `Invalid step "${step}". Must be a number between 0 and ${steps.length - 1}.`,
        );
        console.log("\nAvailable steps:");
        steps.forEach(({ index, name }) => {
          console.log(`  ${index}: ${name}`);
        });
        process.exit(1);
      }

      const target = steps[stepIndex];
      log.info(`Jumping to step ${target.index}: ${target.name}`);
      await workflow.goToStep(stepIndex);
      log.info(`Saving workflow after goto`);
      saveWorkflow(workflow);
    });
};
