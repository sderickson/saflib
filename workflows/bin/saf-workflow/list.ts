import { addNewLinesToString } from "../../strings.ts";
import { getCurrentPackage } from "../../workspace.ts";
import { getPackageName } from "./shared/utils.ts";
import type { WorkflowCommandOptions } from "./shared/types.ts";

export const addListCommand = (commandOptions: WorkflowCommandOptions) => {
  commandOptions.program
    .command("list")
    .option("-a, --all", "List all workflows")
    .option("-d, --details", "List details of each workflow")
    .description(
      addNewLinesToString(
        "List all available workflows for the current package.",
      ),
    )
    .action(async (options: { all?: boolean; details?: boolean }) => {
      const currentPackage = getCurrentPackage();
      const workflows = options.all
        ? commandOptions.workflows
        : commandOptions.workflows.filter((workflow) => {
            return getPackageName(workflow.sourceUrl) === currentPackage;
          });
      workflows.sort((a, b) => a.id.localeCompare(b.id));
      const longestId = workflows.reduce(
        (max, w) => Math.max(max, w.id.length),
        0,
      );
      console.log(
        workflows
          .map((w) => {
            const id = w.id.padEnd(longestId, " ");
            if (options.details) {
              return `${id} - ${w.description}`;
            }
            return id;
          })
          .join("\n"),
      );
    });
};
