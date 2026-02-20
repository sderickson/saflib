import { SpecProjectWorkflowDefinition } from "./spec-project.ts";
import type { WorkflowDefinition } from "@saflib/workflows";
export type { SpecProjectWorkflowContext } from "./spec-project.ts";
export { GetFeedbackStep } from "./get-feedback.ts";

export { SpecProjectWorkflowDefinition };

const workflowDefinitions: WorkflowDefinition[] = [
  SpecProjectWorkflowDefinition,
];

export default workflowDefinitions;
