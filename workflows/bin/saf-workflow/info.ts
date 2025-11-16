import { addNewLinesToString } from "../../strings.ts";
import type { WorkflowArgument, WorkflowDefinition } from "../../core/types.ts";
import { loadWorkflowDefinition } from "./shared/utils.ts";
import {
  createWorkflowLogger,
  setupWorkflowContext,
} from "../../core/store.ts";
import type { WorkflowCommandOptions } from "./shared/types.ts";

export const addInfoCommand = (commandOptions: WorkflowCommandOptions) => {
  commandOptions.program
    .command("info")
    .description(
      addNewLinesToString("Prints usage information for the given workflow."),
    )
    .argument("<path-or-id>", "Workflow ID or path to workflow file")
    .action(async (workflowIdOrPath: string) => {
      const log = createWorkflowLogger({
        printToConsole: false,
      });
      setupWorkflowContext({
        logger: log,
        getSourceUrl: commandOptions.getSourceUrl,
      });

      const workflowDefinition = await loadWorkflowDefinition(
        workflowIdOrPath,
        commandOptions.workflows,
      );
      printWorkflowInfo(workflowDefinition);
    });
};

const printWorkflowInfo = (workflowDefinition: WorkflowDefinition) => {
  const args = workflowDefinition.input
    .map((arg: WorkflowArgument) => `<${arg.name}>`)
    .join(" ");
  console.log(
    `Usage: npm exec saf-workflow kickoff ${workflowDefinition.id} ${args}`,
  );
  console.log();
  console.log(addNewLinesToString(workflowDefinition.description));
  console.log();
  console.log("Arguments:");
  for (const arg of workflowDefinition.input as WorkflowArgument[]) {
    console.log(`  ${arg.name.padEnd(12, " ")}${arg.description}`);
    if (arg.exampleValue) {
      console.log(`              Example: "${arg.exampleValue}"`);
    }
  }
};
