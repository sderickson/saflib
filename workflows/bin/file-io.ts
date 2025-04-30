import { resolve } from "node:path";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { SimpleWorkflow } from "./workflow.ts";
import { workflows } from "../index.ts";
import type { WorkflowBlob } from "./types.ts";

export const getPlanStatusFilePath = () => {
  return resolve(process.cwd(), "saf-plan-status.json");
};

export const loadPlanStatusContents = (): string | null => {
  const planStatusFilePath = getPlanStatusFilePath();
  if (!existsSync(planStatusFilePath)) {
    return null;
  }
  return readFileSync(planStatusFilePath, "utf8");
};

export const saveWorkflow = (workflow: SimpleWorkflow<any, any>) => {
  const planStatusFilePath = getPlanStatusFilePath();
  writeFileSync(
    planStatusFilePath,
    JSON.stringify(workflow.dehydrate(), null, 2),
  );
};

export const loadWorkflow = () => {
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
