import type { Snapshot } from "xstate";
import type { WorkflowContext } from "./xstate.ts";

export type Result<C extends Record<string, any>> = {
  data?: C;
  error?: Error;
};

export interface Step {
  name: string;
  prompt: () => string;
}

export interface CLIArgument {
  name: string;
  description?: string;
  defaultValue?: string;
}

export type WorkflowStatus = "not started" | "in progress" | "completed";

export interface WorkflowBlobInternalState {
  status: WorkflowStatus;
  stepIndex: number;
  data: Record<string, any>;
  params: Record<string, any>;
}

export interface WorkflowBlob {
  workflowName: string;
  internalState?: WorkflowBlobInternalState;
  snapshotState?: Snapshot<any>;
}

export interface TemplateWorkflowContext extends WorkflowContext {
  name: string;
  pascalName: string;
  targetDir: string;
  sourceDir: string;
}

export interface ChecklistItem {
  description: string;
  subitems?: ChecklistItem[];
}
