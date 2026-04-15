import { OpenapiInitWorkflowDefinition } from "./init.ts";
import { OpenApiSchemaWorkflowDefinition } from "./add-schema.ts";
import { AddRouteWorkflowDefinition } from "./add-route.ts";
import { AddEventWorkflowDefinition } from "./add-event.ts";
import type { WorkflowDefinition } from "@saflib/workflows";

export {
  OpenapiInitWorkflowDefinition,
  OpenApiSchemaWorkflowDefinition,
  AddRouteWorkflowDefinition,
  AddEventWorkflowDefinition,
};

const workflowDefinitions: WorkflowDefinition[] = [
  OpenapiInitWorkflowDefinition,
  OpenApiSchemaWorkflowDefinition,
  AddRouteWorkflowDefinition,
  AddEventWorkflowDefinition,
];

export default workflowDefinitions;
