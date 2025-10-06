import type { Snapshot } from "xstate";
import type {
  WorkflowContext,
  WorkflowDefinition,
} from "../../../core/types.ts";
import type {
  GetSourceUrlFunction,
  WorkflowLogger,
} from "../../../core/store.ts";
import type { WorkflowLoggerOptions } from "../../../core/store.ts";
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

export interface WorkflowBlob {
  workflowName: string;
  workflowSourceUrl: string;
  args: string[];
  internalState?: WorkflowBlobInternalState;
  snapshotState?: Snapshot<any> & {
    context: WorkflowContext;
  };
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
