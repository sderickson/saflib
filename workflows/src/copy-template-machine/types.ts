import type { TemplateWorkflowContext } from "../types.ts";

export interface CopyTemplateMachineInput {
  name: string; // kebab-case name
  targetDir: string;
  sourceDir: string;
}

// This is context specific to this machine
export interface CopyTemplateMachineContext extends TemplateWorkflowContext {
  sourceFiles: string[];
  targetFiles: string[];
  filesToCopy: string[];
}
