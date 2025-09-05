import type { Snapshot } from "xstate";

/**
 * High-level status of the workflow.
 */
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
