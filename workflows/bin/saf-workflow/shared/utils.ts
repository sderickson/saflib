import type {
  WorkflowOutput,
  WorkflowDefinition,
  WorkflowArgument,
  WorkflowRunMode,
} from "../../../core/types.ts";
import { XStateWorkflowRunner } from "./workflow.ts";
import path from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { saveWorkflow, loadWorkflowDefinitionFromFile } from "./file-io.ts";
import { resolve } from "node:path";
import { getWorkflowLogger } from "../../../core/store.ts";

export interface RunWorkflowOptions {
  definition: WorkflowDefinition<any, any>;
  runMode: WorkflowRunMode;
  args?: string[];
}

/**
 * Convenience function to take a WorkflowDefinition, run it in the specified mode, and return the output.
 */
export const runWorkflow = async (
  options: RunWorkflowOptions,
): Promise<WorkflowOutput | undefined> => {
  const { definition, runMode, args } = options;
  const cliArguments = definition.input as WorkflowArgument[];
  const exampleArgs = cliArguments.map(
    (arg) => arg.exampleValue || "example-value-missing",
  );
  const workflow = new XStateWorkflowRunner({
    definition,
    args: args || exampleArgs,
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
): Promise<WorkflowOutput | undefined> => {
  return runWorkflow({ definition, runMode: "dry" });
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
 * Load a workflow definition from either a workflow ID or a file path.
 * This is shared logic used by multiple commands.
 */
export const loadWorkflowDefinition = async (
  workflowIdOrPath: string,
  workflows: WorkflowDefinition[],
): Promise<WorkflowDefinition> => {
  const log = getWorkflowLogger();
  log.info(`Loading workflow from path: ${workflowIdOrPath}`);
  let workflowDefinition: WorkflowDefinition | undefined;

  // Check if it's a file path (contains a dot or slash)
  if (workflowIdOrPath.startsWith("./") || workflowIdOrPath.endsWith(".ts")) {
    const resolvedPath = resolve(process.cwd(), workflowIdOrPath);
    log.info(`Loading workflow from file: ${resolvedPath}`);
    workflowDefinition = await loadWorkflowDefinitionFromFile(resolvedPath);
    if (!workflowDefinition) {
      process.exit(1);
    }
    log.info(`Loaded workflow from file: ${workflowIdOrPath}`);
  } else {
    // Look for workflow by ID
    workflowDefinition = workflows.find((w) => w.id === workflowIdOrPath);
    if (!workflowDefinition) {
      log.error(`Error: Workflow with ID "${workflowIdOrPath}" not found`);
      log.info("Available workflows:");
      workflows.forEach((w) => {
        log.info(`  - ${w.id}: ${w.description}`);
      });
      process.exit(1);
    }
    log.info(`Found workflow: ${workflowDefinition.id}`);
  }

  return workflowDefinition;
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
