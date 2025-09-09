import type { Command } from "commander";
import { addNewLinesToString } from "../../strings.ts";
import type { WorkflowDefinition } from "../../core/types.ts";
import { kickoffWorkflow } from "./shared/utils.ts";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { getWorkflowLogger } from "../../core/store.ts";

/**
 * Duck typing function to check if an object is a WorkflowDefinition
 */
function isWorkflowDefinition(obj: any): obj is WorkflowDefinition {
  return (
    obj &&
    typeof obj === "object" &&
    typeof obj.id === "string" &&
    typeof obj.description === "string" &&
    typeof obj.sourceUrl === "string" &&
    Array.isArray(obj.input) &&
    typeof obj.context === "function" &&
    typeof obj.templateFiles === "object" &&
    typeof obj.docFiles === "object" &&
    Array.isArray(obj.steps)
  );
}

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
      try {
        const resolvedPath = resolve(process.cwd(), filePath);

        if (!existsSync(resolvedPath)) {
          console.error(`Error: File not found: ${resolvedPath}`);
          process.exit(1);
        }

        const module = await import(resolvedPath);

        if (!module.default) {
          console.error(`Error: No default export found in ${filePath}`);
          process.exit(1);
        }

        if (!isWorkflowDefinition(module.default)) {
          console.error(
            `Error: Default export from ${filePath} is not a valid WorkflowDefinition`
          );
          console.error(
            "Expected properties: id, description, sourceUrl, input, context, templateFiles, docFiles, steps"
          );
          process.exit(1);
        }

        const workflowDefinition = module.default as WorkflowDefinition;

        // Check if enough arguments were provided
        const expectedArgs = workflowDefinition.input.length;
        const providedArgs = args.length;

        if (providedArgs < expectedArgs) {
          console.error(
            `Error: Expected ${expectedArgs} arguments, but got ${providedArgs}`
          );
          console.error(
            `Workflow "${workflowDefinition.id}" requires: ${workflowDefinition.input.map((arg: any) => arg.name).join(", ")}`
          );
          process.exit(1);
        }

        const log = getWorkflowLogger();

        log.info(`Workflow sucessfully loaded`);
        log.info(`- Workflow:     ${workflowDefinition.id}`);
        log.info(`- Description:  ${workflowDefinition.description}`);
        log.info(`- Arguments:    ${args.join(", ")}`);

        // Kick off the workflow
        await kickoffWorkflow(workflowDefinition, args);
      } catch (error) {
        console.error(
          `Error loading or running workflow from ${filePath}:`,
          error
        );
        process.exit(1);
      }
    });
};
