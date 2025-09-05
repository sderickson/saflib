import type { Command } from "commander";
import type { WorkflowDefinition } from "../core/types.ts";
import { addNewLinesToString } from "../strings.ts";
import { getCurrentPackage } from "@saflib/dev-tools";
import { getPackageName } from "./utils.ts";

export const addListCommand = (
  program: Command,
  workflows: WorkflowDefinition[],
) => {
  program
    .command("list")
    .description(
      addNewLinesToString(
        "List all available workflows for the current package.",
      ),
    )
    .action(async () => {
      const currentPackage = getCurrentPackage();
      const workflowsForPackage = workflows.filter((workflow) => {
        return getPackageName(workflow.sourceUrl) === currentPackage;
      });
      console.log(workflowsForPackage.map((w) => w.id).join("\n"));
    });
};
