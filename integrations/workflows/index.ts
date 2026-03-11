// BEGIN SORTED WORKFLOW AREA workflow-imports FOR workflows/add-workflow
import { InitIntegrationWorkflowDefinition } from "./init-integration.ts";
// END WORKFLOW AREA
import type { WorkflowDefinition } from "@saflib/workflows";

export {
  // BEGIN SORTED WORKFLOW AREA workflow-exports FOR workflows/add-workflow
  InitIntegrationWorkflowDefinition,
  // END WORKFLOW AREA
};

const integrationsWorkflowDefinitions: WorkflowDefinition[] = [
  // BEGIN SORTED WORKFLOW AREA workflow-array FOR workflows/add-workflow
  InitIntegrationWorkflowDefinition,
  // END WORKFLOW AREA
];
export default integrationsWorkflowDefinitions;
