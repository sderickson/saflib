// BEGIN WORKFLOW AREA workflow-imports FOR workflows/add-workflow
import { SpecProjectWorkflowDefinition } from "./spec-project.ts";
// END WORKFLOW AREA
import type { WorkflowDefinition } from "@saflib/workflows";

export type { SpecProjectWorkflowContext } from "./spec-project.ts";
export { GetFeedbackStep } from "./get-feedback.ts";

export {
  // BEGIN WORKFLOW AREA workflow-exports FOR workflows/add-workflow
  SpecProjectWorkflowDefinition,
  // END WORKFLOW AREA
};

const workflowDefinitions: WorkflowDefinition[] = [
  // BEGIN WORKFLOW AREA workflow-array FOR workflows/add-workflow
  SpecProjectWorkflowDefinition,
  // END WORKFLOW AREA
];

export default workflowDefinitions;
