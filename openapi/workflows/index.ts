import { OpenapiInitWorkflowDefinition } from "./init.ts";
import { OpenApiSchemaWorkflowDefinition } from "./add-schema.ts";
import { OpenApiRouteWorkflowDefinition } from "./add-route.ts";
import { AddEventWorkflowDefinition } from "./add-event.ts";
import type { WorkflowDefinition } from "@saflib/workflows";

export {
  OpenapiInitWorkflowDefinition,
  OpenApiSchemaWorkflowDefinition,
  OpenApiRouteWorkflowDefinition,
  AddEventWorkflowDefinition,
};

const workflowDefinitions: WorkflowDefinition[] = [
  OpenapiInitWorkflowDefinition,
  OpenApiSchemaWorkflowDefinition,
  OpenApiRouteWorkflowDefinition,
  AddEventWorkflowDefinition,
];

export default workflowDefinitions;
