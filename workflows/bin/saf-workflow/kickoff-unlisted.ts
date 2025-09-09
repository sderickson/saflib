import type { Command } from "commander";
import { addNewLinesToString } from "../../strings.ts";
import { kickoffWorkflow } from "./shared/utils.ts";
import { resolve } from "node:path";
import { getWorkflowLogger } from "../../core/store.ts";
import { loadWorkflowDefinitionFromFile } from "./shared/file-io.ts";

export const addKickoffUnlistedCommand = (program: Command) => {
  program
    .command("kickoff-unlisted")
    .description(
      addNewLinesToString(
        "Kick off a workflow from a file path. That path should export a definition as its default export."
      )
    )
    .argument("<path>", "Path to the workflow file")
    .argument("[args...]", "Arguments for the workflow")
    .action(async (filePath: string, args: string[]) => {
      const log = getWorkflowLogger();

      const resolvedPath = resolve(process.cwd(), filePath);
      const workflowDefinition =
        await loadWorkflowDefinitionFromFile(resolvedPath);
      if (!workflowDefinition) {
        process.exit(1);
      }

      log.info(`Workflow sucessfully loaded`);
      log.info(`- Workflow:     ${workflowDefinition.id}`);
      log.info(`- Description:  ${workflowDefinition.description}`);
      log.info(
        `- Arguments:    ${workflowDefinition.input.map((arg: any) => arg.name).join(", ")}`
      );

      // Check if enough arguments were provided
      const expectedArgs = workflowDefinition.input.length;
      const providedArgs = args.length;

      if (providedArgs < expectedArgs) {
        log.error(
          `Error: Expected ${expectedArgs} argument${expectedArgs === 1 ? "" : "s"}, but got ${providedArgs}`
        );
        process.exit(1);
      }

      log.info(`- Arguments:    ${args.join(", ")}`);

      // Kick off the workflow
      await kickoffWorkflow(workflowDefinition, args);
    });
};
