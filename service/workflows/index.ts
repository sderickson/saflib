// BEGIN WORKFLOW AREA workflow-imports FOR workflows/add-workflow
import { InitServiceWorkflowDefinition } from "./init.ts";
import { ServiceAddStoreWorkflowDefinition } from "./add-store.ts";
// END WORKFLOW AREA

import type { WorkflowDefinition } from "@saflib/workflows";

export {
  // BEGIN WORKFLOW AREA workflow-exports FOR workflows/add-workflow
  InitServiceWorkflowDefinition,
  ServiceAddStoreWorkflowDefinition,
  // END WORKFLOW AREA
};

const serviceWorkflowDefinitions: WorkflowDefinition[] = [
  // BEGIN WORKFLOW AREA workflow-array FOR workflows/add-workflow
  InitServiceWorkflowDefinition,
  ServiceAddStoreWorkflowDefinition,
  // END WORKFLOW AREA
];
export default serviceWorkflowDefinitions;
