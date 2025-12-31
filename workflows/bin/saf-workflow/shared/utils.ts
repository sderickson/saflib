import type {
  WorkflowOutput,
  WorkflowDefinition,
  WorkflowArgument,
  WorkflowExecutionMode,
  AgentConfig,
  VersionControlMode,
} from "../../../core/types.ts";
import { XStateWorkflowRunner } from "./workflow.ts";
import path from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { loadWorkflowDefinitionFromFile, saveWorkflow } from "./file-io.ts";
import { resolve } from "node:path";
import { getWorkflowLogger } from "../../../core/store.ts";
import type { Snapshot } from "xstate";

/**
 * Argument for the runWorkflow function.
 */
export interface RunWorkflowOptions {
  /**
   * The workflow definition to run.
   */
  definition: WorkflowDefinition<any, any>;

  /**
   * The mode to run the workflow in.
   */
  runMode: WorkflowExecutionMode;

  /**
   * The arguments to pass to the workflow.
   */
  args?: string[];

  /**
   * The agent config to use for the workflow. Required if runMode is "run".
   */
  agentConfig?: AgentConfig;

  /**
   * Whether to skip TODOs in the workflow. They're already skipped in "dry" and "script" modes; this is mainly used to override the default behaviors, for example in automated testing of run and print modes.
   */
  skipTodos?: boolean;

  /**
   * If included, the workflow tool will check file changes, push back on unexpected changes, and commit expected changes automatically.
   */
  manageVersionControl?: VersionControlMode;
}

/**
 * Return value of the runWorkflow function.
 *
 * These are used internally and so may change in the future.
 */
export interface RunWorkflowResult {
  /**
   * The output of the workflow state machine.
   */
  output: WorkflowOutput | undefined;

  /**
   * The state of the workflow state machine.
   */
  state: Snapshot<any> | undefined;
}

/**
 * Convenience function to take a WorkflowDefinition, run it in the specified mode, and return the output.
 * Can be used to run a given workflow in checklist mode for a unit test. This is also used internally
 * by the CLI tool.
 */
export const runWorkflow = async (
  options: RunWorkflowOptions
): Promise<RunWorkflowResult> => {
  const { definition, runMode, args } = options;
  const cliArguments = definition.input as WorkflowArgument[];
  const exampleArgs = cliArguments.map(
    (arg) => arg.exampleValue || "example-value-missing"
  );
  const workflow = new XStateWorkflowRunner({
    definition,
    args: args || exampleArgs,
    workflowExecutionMode: runMode,
    agentConfig: options.agentConfig,
    manageVersionControl: options.manageVersionControl,
    skipTodos: options.skipTodos,
  });
  console.log("Kicking off workflow", workflow.definition.id);
  await workflow.kickoff({
    onSnapshot: () => {
      saveWorkflow(workflow);
    },
  });
  if (runMode === "print") {
    console.log("--- To continue, run 'npm exec saf-workflow next' ---\n");
    saveWorkflow(workflow);
  }
  return {
    output: workflow.getOutput(),
    state: workflow.dehydrate().snapshotState as unknown as Snapshot<any>,
  };
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
 * Load a workflow definition from either a workflow ID or a file path.
 * This is shared logic used by multiple commands.
 */
export const loadWorkflowDefinition = async (
  workflowIdOrPath: string,
  workflows: WorkflowDefinition[]
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
      log.error(`Error: Workflow definition not found at ${resolvedPath}`);
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
