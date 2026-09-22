export * from "./types.ts";
export * from "./output.ts";
export {
  defineWorkflow,
  step,
  createRun,
  advanceRun,
  isRunAdvancing,
  type AdvanceRunOptions,
} from "./engine.ts";
export { stepSkipIf, isWorkflowStepSkip } from "./conditional-step.ts";
export { commitIfDirty, revertUncommittedChanges } from "./git.ts";
export { RUN_LOCK_MESSAGE } from "./run-lock.ts";

export {
  runCopyStep,
  repairJsonAfterDroppedLines,
  resolveCopyTargetPaths,
  resolveCopyTargetPath,
  type CopyStepInput,
} from "./steps/copy/copy-step.ts";
export { runUpdateStep, type UpdateStepInput } from "./steps/update.ts";
export { runPromptStep, type PromptStepInput } from "./steps/prompt.ts";
export { runCommandStep, type CommandStepInput } from "./steps/command.ts";
export { runCdStep, type CdStepInput } from "./steps/cd.ts";
export { runNpmScriptStep, type NpmScriptStepInput } from "./steps/npm-script.ts";
export {
  runTransformFileStep,
  type TransformFileStepInput,
} from "./steps/transform-file.ts";
export {
  runCallWorkflowStep,
  type CallWorkflowStepInput,
} from "./steps/call-workflow.ts";

export {
  validateWorkflowConfigBody,
} from "./config/validate.ts";
export { compileConfigWorkflow } from "./config/compile.ts";
export { loadWorkflowDefinition } from "./load-definition.ts";
export {
  describeWorkflowSteps,
  summarizeStepInput,
  type WorkflowRunStepDescription,
} from "./describe-steps.ts";
export { cancelActiveAgentProcess } from "./agents/registry.ts";
export { cancelRunAndDescendants } from "./cancel-run.ts";
export {
  parseGotoPath,
  formatGotoPath,
  buildStepTree,
  gotoRunStep,
  formatStepTree,
  GotoPathError,
  type StepTreeNode,
  type GotoRunStepResult,
} from "./goto.ts";
export { CANCELLED_BY_USER_MESSAGE } from "./agents/claude-agent.ts";
export {
  parseToolLogPayload,
  type ToolUseLogPayload,
  type ToolResultLogPayload,
  type ToolLogPayload,
} from "./agents/tool-log-payload.ts";

export {
  getPackageName,
  checkPackageDependency,
  parsePackageName,
  parsePath,
  makeLineReplace,
  isSkippedStubRefLine,
  type ParsePackageNameInput,
  type ParsePackageNameOutput,
  type ParsePathInput,
  type ParsePathOutput,
} from "./templating.ts";

export { HelloWorkflowDefinition } from "./example-workflows/hello-workflow.ts";

export {
  previewRun,
  type PreviewResult,
  type PreviewStepEntry,
  type PreviewRunOptions,
  type PreviewFileChange,
} from "./preview/preview-run.ts";
