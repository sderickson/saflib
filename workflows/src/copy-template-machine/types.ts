import type { TemplateWorkflowContext } from "../types.ts";
import type { WorkflowInput } from "../xstate.ts";

export interface CopyTemplateMachineInput extends WorkflowInput {
  name: string; // kebab-case name
  targetDir: string;
  sourceDir: string;
}

export interface CopyTemplateMachineContext extends TemplateWorkflowContext {
  sourceFiles: string[];
  targetFiles: string[];
  filesToCopy: string[];
}
