import { resolve } from "node:path";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import type { WorkflowMeta, Workflow } from "./workflow.ts";
import type { WorkflowBlob } from "./types.ts";

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

export const saveWorkflow = (workflow: Workflow) => {
  const planStatusFilePath = getPlanStatusFilePath();
  writeFileSync(
    planStatusFilePath,
    JSON.stringify(workflow.dehydrate(), null, 2),
  );
};

export const loadWorkflow = (workflows: WorkflowMeta[]) => {
  const contents = loadPlanStatusContents();
  if (!contents) {
    return null;
  }
  const blob = JSON.parse(contents) as WorkflowBlob;

  const workflow = workflows.find((w) => w.name === blob.workflowName);
  if (!workflow) {
    return null;
  }
  const instance = new workflow.Workflow();
  instance.hydrate(blob);
  return instance;
};
