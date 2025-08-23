import type { Command } from "commander";
import type { WorkflowMeta } from "../workflow.ts";
import { addNewLinesToString } from "@saflib/utils";
import { getCurrentPackage } from "@saflib/dev-tools";

export const addListCommand = (program: Command, workflows: WorkflowMeta[]) => {
  program
    .command("list")
    .description(
      addNewLinesToString(
        "List all available workflows for the current package.",
      ),
    )
    .action(async () => {
      const currentPackage = getCurrentPackage();
      const workflowsForPackage = workflows.filter(
        (workflow) => workflow.packageName === currentPackage,
      );
      console.log(workflowsForPackage.map((w) => w.name).join("\n"));
    });
};
