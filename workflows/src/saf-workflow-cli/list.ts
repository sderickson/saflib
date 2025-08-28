import type { Command } from "commander";
import type { ConcreteWorkflow } from "../workflow.ts";
import { addNewLinesToString } from "@saflib/utils";
import { getCurrentPackage } from "@saflib/dev-tools";
import { getPackageName } from "../workflow.ts";

export const addListCommand = (
  program: Command,
  workflows: ConcreteWorkflow[],
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
        const stubWorkflow = new workflow();
        return getPackageName(stubWorkflow.sourceUrl) === currentPackage;
      });
      console.log(workflowsForPackage.map((w) => new w().name).join("\n"));
    });
};
