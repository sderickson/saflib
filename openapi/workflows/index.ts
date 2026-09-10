// BEGIN WORKFLOW AREA workflow-imports FOR workflows/add-workflow
import { OpenapiInitWorkflowDefinition } from "./init.ts";
import { OpenApiSchemaWorkflowDefinition } from "./add-schema.ts";
import { OpenApiRouteWorkflowDefinition } from "./add-route.ts";
import { AddEventWorkflowDefinition } from "./add-event.ts";
// END WORKFLOW AREA
import type { WorkflowDefinition } from "@saflib/workflows";

export {
  // BEGIN WORKFLOW AREA workflow-exports FOR workflows/add-workflow
  OpenapiInitWorkflowDefinition,
  OpenApiSchemaWorkflowDefinition,
  OpenApiRouteWorkflowDefinition,
  AddEventWorkflowDefinition,
  // END WORKFLOW AREA
};

const workflowDefinitions: WorkflowDefinition[] = [
  // BEGIN WORKFLOW AREA workflow-array FOR workflows/add-workflow
  OpenapiInitWorkflowDefinition,
  OpenApiSchemaWorkflowDefinition,
  OpenApiRouteWorkflowDefinition,
  AddEventWorkflowDefinition,
  // END WORKFLOW AREA
];

export default workflowDefinitions;
