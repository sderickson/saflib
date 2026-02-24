// BEGIN SORTED WORKFLOW AREA workflow-imports FOR workflows/add-workflow
import { InitServiceWorkflowDefinition } from "./init.ts";
import { ServiceAddStoreWorkflowDefinition } from "./add-store.ts";
// END WORKFLOW AREA

import type { WorkflowDefinition } from "@saflib/workflows";

export {
  // BEGIN SORTED WORKFLOW AREA workflow-exports FOR workflows/add-workflow
  InitServiceWorkflowDefinition,
  ServiceAddStoreWorkflowDefinition,
  // END WORKFLOW AREA
};

const serviceWorkflowDefinitions: WorkflowDefinition[] = [
  // BEGIN SORTED WORKFLOW AREA workflow-array FOR workflows/add-workflow
  InitServiceWorkflowDefinition,
  ServiceAddStoreWorkflowDefinition,
  // END WORKFLOW AREA
];
export default serviceWorkflowDefinitions;
