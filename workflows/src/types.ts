import type { Snapshot } from "xstate";
import type { WorkflowContext } from "./xstate.ts";

/**
 * Required argument for the workflow, in a format the CLI tool (commander) can use.
 */
export interface CLIArgument {
  name: string;
  description?: string;

  /**
   * When generating an example checklist, this is the value that will be provided.
   */
  exampleValue?: string;
}

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

/**
 * There are at least two machines which work on templates: creating
 * and updating. These share some common context properties in addition
 * to WorkflowContext properties.
 */
export interface TemplateWorkflowContext extends WorkflowContext {
  /**
   * kebab-case name of the thing being created or updated, such as
   * "home" for a web page or "get-by-id" for a database query.
   */
  name: string;

  /**
   * PascalCase version of the kebab-case name.
   */
  pascalName: string;

  /**
   * Absolute path to the directory where updated copies of the template files will go.
   */
  targetDir: string;

  /**
   * Absolute path to the directory where the template files are located.
   */
  sourceDir: string;
}

/**
 * Simple checklist object. Machines should append one to the list for each
 * state. If a state invokes another machine, add its checklist output as subitems
 * to create a recursively generated checklist tree.
 */
export interface ChecklistItem {
  description: string;
  subitems?: ChecklistItem[];
}

/**
 * State objects which can be passed into [XStateMachine Actor Definitions](https://stately.ai/docs/state-machine-actors). These are typed simply here because I'll be damned if I can figure out how to use the XState library's provided generics.
 */
export interface XStateMachineStates {
  [key: string]: object;
}
