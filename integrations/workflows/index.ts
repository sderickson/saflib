// BEGIN SORTED WORKFLOW AREA workflow-imports FOR workflows/add-workflow
import { AddCallWorkflowDefinition } from "./add-call.ts";
import { InitIntegrationWorkflowDefinition } from "./init-integration.ts";
// END WORKFLOW AREA
import type { WorkflowDefinition } from "@saflib/workflows";

export {
  // BEGIN SORTED WORKFLOW AREA workflow-exports FOR workflows/add-workflow
  AddCallWorkflowDefinition,
  InitIntegrationWorkflowDefinition,
  // END WORKFLOW AREA
};

const integrationsWorkflowDefinitions: WorkflowDefinition[] = [
  // BEGIN SORTED WORKFLOW AREA workflow-array FOR workflows/add-workflow
  AddCallWorkflowDefinition,
  InitIntegrationWorkflowDefinition,
  // END WORKFLOW AREA
];
export default integrationsWorkflowDefinitions;
