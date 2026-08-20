// BEGIN WORKFLOW AREA workflow-imports FOR workflows/add-workflow
import { ServiceAddStoreWorkflowDefinition } from "./add-store.ts";
import { InitCommonWorkflowDefinition } from "./init-common.ts";
// END WORKFLOW AREA

import type { WorkflowDefinition } from "@saflib/workflows";

export {
  // BEGIN WORKFLOW AREA workflow-exports FOR workflows/add-workflow
  ServiceAddStoreWorkflowDefinition,
  /** @deprecated Prefer product/init + domain offshoot inits. Kept for rare shared-common scaffolds. */
  InitCommonWorkflowDefinition,
  // END WORKFLOW AREA
};

const serviceWorkflowDefinitions: WorkflowDefinition[] = [
  // BEGIN WORKFLOW AREA workflow-array FOR workflows/add-workflow
  ServiceAddStoreWorkflowDefinition,
  InitCommonWorkflowDefinition,
  // END WORKFLOW AREA
];
export default serviceWorkflowDefinitions;
