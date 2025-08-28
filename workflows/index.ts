export {
  getPackageName,
  type WorkflowMeta,
  type ConcreteWorkflow,
  contextFromInput,
  outputFromContext,
  XStateWorkflow,
  Workflow,
} from "./src/workflow.ts";

export { runWorkflowCli } from "./src/saf-workflow-cli/index.ts";

export type {
  CLIArgument,
  TemplateWorkflowContext,
  ChecklistItem,
  XStateMachineStates,
} from "./src/types.ts";

export {
  workflowActions,
  workflowActors,
  promptAgentComposer,
  type WorkflowInput,
  logInfo,
  type WorkflowContext,
  logError,
  type WorkflowOutput,
  type LogParams,
  type ComposerFunctionOptions,
} from "./src/xstate.ts";

export { copyTemplateStateComposer } from "./src/copy-template-machine/copy-template-machine.ts";

export {
  type UpdateTemplateFileComposerOptions,
  updateTemplateComposer,
} from "./src/update-template-machine/update-template-machine.ts";

export * from "./src/test-runner.ts";
export * from "./src/npm.ts";
