import { resolve } from "node:path";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import {
  XStateWorkflowRunner,
  type AbstractWorkflowRunner,
} from "./workflow.ts";
import type { WorkflowDefinition } from "../../../core/types.ts";
import type { WorkflowBlob } from "./types.ts";
import { isWorkflowDefinition } from "./utils.ts";
import { getWorkflowLogger } from "../../../core/store.ts";

export const getPlanStatusFilePath = () => {
  return resolve(process.cwd(), "saf-workflow-status.json");
};

export const loadPlanStatusContents = (): string | null => {
  const planStatusFilePath = getPlanStatusFilePath();
  if (!existsSync(planStatusFilePath)) {
    return null;
  }
  return readFileSync(planStatusFilePath, "utf8");
};

export const saveWorkflow = (workflow: AbstractWorkflowRunner) => {
  const planStatusFilePath = getPlanStatusFilePath();
  writeFileSync(
    planStatusFilePath,
    JSON.stringify(workflow.dehydrate(), null, 2)
  );
};

export const loadWorkflow = (workflows: WorkflowDefinition[]) => {
  const contents = loadPlanStatusContents();
  if (!contents) {
    return null;
  }
  const blob = JSON.parse(contents) as WorkflowBlob;

  const workflow = workflows.find((w) => w.id === blob.workflowName);

  if (blob.workflowSourceUrl) {
    // TODO
  }

  if (!workflow) {
    return null;
  }
  const instance = new XStateWorkflowRunner({
    definition: workflow,
    args: blob.args,
    dryRun: false,
  });
  instance.hydrate(blob);
  return instance;
};

export const loadWorkflowDefinitionFromFile = async (
  filePath: string
): Promise<WorkflowDefinition | null> => {
  const log = getWorkflowLogger();
  if (!existsSync(filePath)) {
    log.error(`Error: File not found: ${filePath}`);
    return null;
  }

  const module = await import(filePath);

  if (!module.default) {
    log.error(`Error: No default export found in ${filePath}`);
    return null;
  }

  if (!isWorkflowDefinition(module.default)) {
    log.error(
      `Error: Default export from ${filePath} is not a valid WorkflowDefinition`
    );
    return null;
  }

  return module.default;
};
