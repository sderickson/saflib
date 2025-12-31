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
import path from "node:path";

export const getPlanStatusFilePath = () => {
  return resolve(process.cwd(), "saf-workflow-status.json");
};

export const getErrorStatusFilePath = () => {
  return resolve(process.cwd(), "saf-workflow-status.error.json");
};

export const loadPlanStatusContents = (): string | undefined => {
  const planStatusFilePath = getPlanStatusFilePath();
  if (!existsSync(planStatusFilePath)) {
    return undefined;
  }
  return readFileSync(planStatusFilePath, "utf8");
};

let announcedError = false;

export const saveWorkflow = (workflow: AbstractWorkflowRunner) => {
  const blob = workflow.dehydrate();
  const snapshots = [blob.snapshotState];
  let anyErrors = false;
  while (snapshots.length > 0) {
    const snapshot = snapshots.shift();
    if (snapshot?.status === "error") {
      anyErrors = true;
      break;
    }
    if (snapshot?.children) {
      Object.values(snapshot.children).forEach((child) => {
        snapshots.push(child.snapshot);
      });
    }
  }
  if (anyErrors) {
  }
  const planStatusFilePath = anyErrors
    ? getErrorStatusFilePath()
    : getPlanStatusFilePath();
  writeFileSync(
    planStatusFilePath,
    JSON.stringify(workflow.dehydrate(), null, 2)
  );
  if (anyErrors) {
    if (!announcedError) {
      console.error(`!!! Workflow has errors!        
!!! Snapshot saved to ${path.basename(getErrorStatusFilePath())}.
!!! Workflows whose machines are in error cannot continue, so fix the underlying issue.
!!! Workflows should not enter the error state in normal operation.`);
      announcedError = true;
    }
  }
};

export const loadWorkflow = async (workflows: WorkflowDefinition[]) => {
  const contents = loadPlanStatusContents();
  if (!contents) {
    return undefined;
  }
  const blob = JSON.parse(contents) as WorkflowBlob;

  let workflow = workflows.find((w) => w.id === blob.workflowName);

  if (blob.workflowSourceUrl && !workflow) {
    workflow = await loadWorkflowDefinitionFromFile(
      blob.workflowSourceUrl.replace("file://", "")
    );
  }

  if (!workflow) {
    return undefined;
  }
  const instance = new XStateWorkflowRunner({
    definition: workflow,
    args: blob.args,
    workflowExecutionMode: "print",
  });
  instance.hydrate(blob, {
    onSnapshot: () => {
      saveWorkflow(instance);
    },
  });
  return instance;
};

export const loadWorkflowDefinitionFromFile = async (
  filePath: string
): Promise<WorkflowDefinition | undefined> => {
  const log = getWorkflowLogger();
  if (!existsSync(filePath)) {
    log.error(`Error: File not found: ${filePath}`);
    return undefined;
  }

  const module = await import(filePath);

  if (!module.default) {
    log.error(`Error: No default export found in ${filePath}`);
    return undefined;
  }

  if (!isWorkflowDefinition(module.default)) {
    log.error(
      `Error: Default export from ${filePath} is not a valid WorkflowDefinition`
    );
    return undefined;
  }

  return module.default;
};
