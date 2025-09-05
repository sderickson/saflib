import { resolve } from "node:path";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import {
  XStateWorkflowRunner,
  type AbstractWorkflowRunner,
} from "./workflow.ts";
import type { WorkflowDefinition } from "../core/types.ts";
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

export const saveWorkflow = (workflow: AbstractWorkflowRunner) => {
  const planStatusFilePath = getPlanStatusFilePath();
  console.log("workflow.dehydrate()", workflow.dehydrate());
  writeFileSync(
    planStatusFilePath,
    JSON.stringify(workflow.dehydrate(), null, 2),
  );
};

export const loadWorkflow = (workflows: WorkflowDefinition[]) => {
  const contents = loadPlanStatusContents();
  if (!contents) {
    return null;
  }
  const blob = JSON.parse(contents) as WorkflowBlob;

  const workflow = workflows.find((w) => w.id === blob.workflowName);
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
