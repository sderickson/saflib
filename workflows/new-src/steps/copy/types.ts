import type { WorkflowContext } from "../../../src/xstate.ts";

export interface CopyTemplateMachineContext extends WorkflowContext {
  filesToCopy: string[];
}
