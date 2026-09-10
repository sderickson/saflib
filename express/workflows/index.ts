// BEGIN WORKFLOW AREA workflow-imports FOR workflows/add-workflow
import { AddHandlerWorkflowDefinition } from "./add-handler.ts";
import { ExpressInitWorkflowDefinition } from "./init.ts";
// END WORKFLOW AREA
import type { WorkflowDefinition } from "@saflib/workflows";

export {
  // BEGIN WORKFLOW AREA workflow-exports FOR workflows/add-workflow
  AddHandlerWorkflowDefinition,
  ExpressInitWorkflowDefinition,
  // END WORKFLOW AREA
};

const workflowDefinitions: WorkflowDefinition[] = [
  // BEGIN WORKFLOW AREA workflow-array FOR workflows/add-workflow
  AddHandlerWorkflowDefinition,
  ExpressInitWorkflowDefinition,
  // END WORKFLOW AREA
];

export default workflowDefinitions;
