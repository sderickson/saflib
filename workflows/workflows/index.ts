// BEGIN WORKFLOW AREA workflow-imports FOR workflows/add-workflow
import { AddWorkflowDefinition } from "./add-workflow.ts";
// END WORKFLOW AREA
import type { WorkflowDefinition } from "../core/index.ts";

const workflowClasses: WorkflowDefinition[] = [
  // BEGIN WORKFLOW AREA workflow-exports FOR workflows/add-workflow
  AddWorkflowDefinition,
  // END WORKFLOW AREA
];

export {
  // BEGIN WORKFLOW AREA workflow-array FOR workflows/add-workflow
  AddWorkflowDefinition,
  // END WORKFLOW AREA
};

export default workflowClasses;
