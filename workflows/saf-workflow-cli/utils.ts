import type {
  WorkflowOutput,
  WorkflowDefinition,
  WorkflowArgument,
} from "../core/types.ts";
import { XStateWorkflowRunner } from "./workflow.ts";
import path from "node:path";
import { existsSync, readFileSync } from "node:fs";

/**
 * Convenience function to take a ConcretWorkflowRunner, dry run it, and return the output. The output in particular includes the checklist.
 */
export const dryRunWorkflow = async (
  definition: WorkflowDefinition<any, any>,
): Promise<WorkflowOutput> => {
  const cliArguments = definition.input as WorkflowArgument[];
  const exampleArgs = cliArguments.map(
    (arg) => arg.exampleValue || "example-value-missing",
  );
  const workflow = new XStateWorkflowRunner({
    definition,
    args: exampleArgs,
    dryRun: true,
  });
  await workflow.kickoff();
  let lastStateName = workflow.getCurrentStateName();

  while (!workflow.done()) {
    await workflow.goToNextStep();
    const error = workflow.getError();
    if (error) {
      console.error("Workflow errored", error);
      process.exit(1);
    }
    const currentStateName = workflow.getCurrentStateName();
    if (currentStateName === lastStateName) {
      throw new Error(
        `Workflow ${definition.id} is stuck on state ${currentStateName}.`,
      );
    }
    lastStateName = currentStateName;
  }

  return workflow.getOutput();
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
