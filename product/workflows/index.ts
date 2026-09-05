// BEGIN WORKFLOW AREA workflow-imports FOR workflows/add-workflow
import { InitProductWorkflowDefinition } from "./init.ts";
// END WORKFLOW AREA
import type { WorkflowDefinition } from "@saflib/workflows";

export {
  // BEGIN WORKFLOW AREA workflow-exports FOR workflows/add-workflow
  InitProductWorkflowDefinition,
  // END WORKFLOW AREA
};

const ProductWorkflowDefinitions: WorkflowDefinition[] = [
  // BEGIN WORKFLOW AREA workflow-array FOR workflows/add-workflow
  InitProductWorkflowDefinition,
  // END WORKFLOW AREA
];
export default ProductWorkflowDefinitions;
