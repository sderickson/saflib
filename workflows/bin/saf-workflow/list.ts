import { addNewLinesToString } from "../../strings.ts";
import { getCurrentPackage } from "../../workspace.ts";
import { getPackageName } from "./shared/utils.ts";
import type { WorkflowCommandOptions } from "./shared/types.ts";

export const addListCommand = (commandOptions: WorkflowCommandOptions) => {
  commandOptions.program
    .command("list")
    .description(
      addNewLinesToString(
        "List all available workflows for the current package.",
      ),
    )
    .action(async () => {
      const currentPackage = getCurrentPackage();
      const workflowsForPackage = commandOptions.workflows.filter(
        (workflow) => {
          return getPackageName(workflow.sourceUrl) === currentPackage;
        },
      );
      console.log(workflowsForPackage.map((w) => w.id).join("\n"));
    });
};
