import type { Command } from "commander";
import { addNewLinesToString } from "../../strings.ts";
import type { WorkflowDefinition } from "../../core/types.ts";
import { kickoffWorkflow } from "./shared/utils.ts";
import { resolve } from "node:path";
import { existsSync } from "node:fs";

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
        "Kick off a workflow from a file path. Takes a path to a file whose default export is a WorkflowDefinition, followed by any arguments the workflow needs.\n\nExample:\n\nnpm exec saf-workflow kickoff-unlisted ./path/to/workflow.ts arg1 arg2"
      )
    )
    .argument("<filePath>", "Path to the workflow file")
    .argument("[args...]", "Arguments for the workflow")
    .action(async (filePath: string, args: string[]) => {
      try {
        // Resolve the file path relative to current working directory
        const resolvedPath = resolve(process.cwd(), filePath);

        // Check if file exists
        if (!existsSync(resolvedPath)) {
          console.error(`Error: File not found: ${resolvedPath}`);
          process.exit(1);
        }

        // Dynamic import of the workflow file
        const module = await import(resolvedPath);

        // Check if the module has a default export
        if (!module.default) {
          console.error(`Error: No default export found in ${filePath}`);
          process.exit(1);
        }

        // Validate that the default export is a WorkflowDefinition
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

        console.log(`Starting workflow: ${workflowDefinition.id}`);
        console.log(`Description: ${workflowDefinition.description}`);
        console.log(`Arguments: ${args.join(", ")}\n`);

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
