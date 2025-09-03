import type { WorkflowContext, WorkflowInput } from "../../../src/xstate.ts";

export interface CopyTemplateMachineInput extends WorkflowInput {
  name: string;
  targetDir: string;
}

export interface CopyTemplateMachineContext extends WorkflowContext {
  filesToCopy: string[];
  name: string;
  targetDir: string;
  copiedFiles: Record<string, string>;
}
