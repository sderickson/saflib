export {
  getPackageName,
  type WorkflowMeta,
  type ConcreteWorkflow,
  contextFromInput,
  outputFromContext,
  XStateWorkflow,
  SimpleWorkflow,
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
  promptAgent,
  doTestsPass,
  doesTestPass,
  generateMigrations,
  type WorkflowOutput,
  type LogParams,
  type ComposerFunctionOptions,
  promptState,
} from "./src/xstate.ts";

export { copyTemplateStateComposer } from "./src/copy-template-machine/copy-template-machine.ts";

export {
  type UpdateTemplateFileComposerOptions,
  updateTemplateComposer,
} from "./src/update-template-machine/update-template-machine.ts";

export * from "./src/test-runner.ts";
export * from "./src/npm.ts";
