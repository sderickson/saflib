import type {
  WorkflowOutput,
  WorkflowDefinition,
  WorkflowArgument,
  WorkflowRunMode,
} from "../../../core/types.ts";
import { XStateWorkflowRunner } from "./workflow.ts";
import path from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { saveWorkflow } from "./file-io.ts";

/**
 * Convenience function to take a WorkflowDefinition, run it in the specified mode, and return the output.
 */
export const runWorkflow = async (
  definition: WorkflowDefinition<any, any>,
  runMode: WorkflowRunMode,
): Promise<WorkflowOutput> => {
  const cliArguments = definition.input as WorkflowArgument[];
  const exampleArgs = cliArguments.map(
    (arg) => arg.exampleValue || "example-value-missing",
  );
  const workflow = new XStateWorkflowRunner({
    definition,
    args: exampleArgs,
    workflowRunMode: runMode,
  });
  await workflow.kickoff();
  return workflow.getOutput();
};

/**
 * Convenience function to take a WorkflowDefinition, dry run it, and return the output. The output in particular includes the checklist.
 * @deprecated Use runWorkflow with runMode: "dry" instead
 */
export const dryRunWorkflow = async (
  definition: WorkflowDefinition<any, any>,
): Promise<WorkflowOutput> => {
  return runWorkflow(definition, "dry");
};

/**
 * Utility function to get the package name from the root URL.
 */
export function getPackageName(rootUrl: string) {
  if (!rootUrl.startsWith("file://")) {
    throw new Error("Root URL should be import.meta.url");
  }
  const rootPath = path.dirname(rootUrl.replace("file://", ""));
  let currentDir = rootPath;
  while (true) {
    const packageJsonPath = path.join(currentDir, "package.json");
    if (existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
      return packageJson.name;
    }
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      throw new Error("package.json not found");
    }
    currentDir = parentDir;
  }
}

/**
 * Shared utility function to kick off a workflow with the given definition and arguments.
 * This is used by both the regular kickoff command and the kickoff-unlisted command.
 */
export const kickoffWorkflow = async (
  Workflow: WorkflowDefinition,
  args: string[],
) => {
  const workflow = new XStateWorkflowRunner({
    definition: Workflow,
    args: args.slice(0, Workflow.input.length),
    workflowRunMode: "print",
  });
  await workflow.kickoff();
  console.log("--- To continue, run 'npm exec saf-workflow next' ---\n");
  saveWorkflow(workflow);
};

/**
 * Duck typing function to check if an object is a WorkflowDefinition
 */
export function isWorkflowDefinition(obj: any): obj is WorkflowDefinition {
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
