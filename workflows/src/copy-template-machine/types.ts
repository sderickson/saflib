import type { WorkflowContext } from "../xstate.ts";

export interface CopyTemplateMachineInput {
  name: string; // kebab-case name
  targetDir: string;
  sourceDir: string;
}

// Machines which invoke this one should include this context
export interface TemplateWorkflowContext extends WorkflowContext {
  name: string;
  pascalName: string;
  targetDir: string;
  sourceDir: string;
}

// This is context specific to this machine
export interface CopyTemplateMachineContext extends TemplateWorkflowContext {
  sourceFiles: string[];
  targetFiles: string[];
  filesToCopy: string[];
}
