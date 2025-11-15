import type { SnapshotStatus } from "xstate";
import type {
  WorkflowContext,
  WorkflowDefinition,
} from "../../../core/types.ts";
import type { GetSourceUrlFunction } from "../../../core/store.ts";
import type { Command } from "commander";

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

/**
 * Can't seem to pull out the type of the persisted snapshot from xstate. So here's my own.
 */
export interface PersistedSnapshot {
  status: SnapshotStatus;
  value: string;
  context: WorkflowContext;
  children: Record<
    string,
    {
      snapshot: PersistedSnapshot;
      src: string;
      syncSnapshot: boolean;
    }
  >;
}

export interface WorkflowBlob {
  workflowName: string;
  workflowSourceUrl: string;
  args: string[];
  internalState?: WorkflowBlobInternalState;
  snapshotState: PersistedSnapshot;
}

/**
 * Options for configuring the workflow CLI
 */
export interface WorkflowCliOptions {
  getSourceUrl?: GetSourceUrlFunction;
}

export interface WorkflowCommandOptions {
  getSourceUrl?: GetSourceUrlFunction;
  program: Command;
  workflows: WorkflowDefinition[];
}
