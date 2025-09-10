import type { Command } from "commander";
import { checklistToString } from "../../core/utils.ts";
import type { WorkflowDefinition } from "../../core/types.ts";
import { addNewLinesToString } from "../../strings.ts";
import { dryRunWorkflow } from "./shared/utils.ts";
import { loadWorkflowDefinitionFromFile } from "./shared/file-io.ts";
import { resolve } from "node:path";
import { getWorkflowLogger } from "../../core/store.ts";

export const addChecklistCommand = (
  program: Command,
  workflows: WorkflowDefinition[],
) => {
  program
    .command("checklist")
    .description(
      addNewLinesToString(
        "Show the checklist for a workflow. Can be called with a workflow ID or a file path to a workflow definition.",
      ),
    )
    .argument("<workflowIdOrPath>", "Workflow ID or path to workflow file")
    .action(async (workflowIdOrPath: string) => {
      const log = getWorkflowLogger();
      log.info(`Loading workflow from path: ${workflowIdOrPath}`);
      let workflowDefinition: WorkflowDefinition | undefined;

      // Check if it's a file path (contains a dot or slash)
      if (
        workflowIdOrPath.startsWith("./") ||
        workflowIdOrPath.endsWith(".ts")
      ) {
        const resolvedPath = resolve(process.cwd(), workflowIdOrPath);
        log.info(`Loading workflow from file: ${resolvedPath}`);
        workflowDefinition = await loadWorkflowDefinitionFromFile(resolvedPath);
        if (!workflowDefinition) {
          process.exit(1);
        }
        log.info(`Loaded workflow from file: ${workflowIdOrPath}`);
      } else {
        // Look for workflow by ID
        workflowDefinition = workflows.find((w) => w.id === workflowIdOrPath);
        if (!workflowDefinition) {
          log.error(`Error: Workflow with ID "${workflowIdOrPath}" not found`);
          log.info("Available workflows:");
          workflows.forEach((w) => {
            log.info(`  - ${w.id}: ${w.description}`);
          });
          process.exit(1);
        }
        log.info(`Found workflow: ${workflowDefinition.id}`);
      }

      await printChecklist(workflowDefinition);
    });
};

export const printChecklist = async (Workflow: WorkflowDefinition) => {
  const workflow = await dryRunWorkflow(Workflow);
  console.log(
    checklistToString(
      workflow.checklist.subitems || [{ description: "No checklist output" }],
    ),
  );
};
