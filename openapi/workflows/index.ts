import { OpenapiInitWorkflowDefinition } from "./init.ts";
import { AddSchemaWorkflowDefinition } from "./add-schema.ts";
import { AddRouteWorkflowDefinition } from "./add-route.ts";
import { AddEventWorkflowDefinition } from "./add-event.ts";
import type { WorkflowDefinition } from "@saflib/workflows";

export {
  OpenapiInitWorkflowDefinition,
  AddSchemaWorkflowDefinition,
  AddRouteWorkflowDefinition,
  AddEventWorkflowDefinition,
};

const workflowDefinitions: WorkflowDefinition[] = [
  OpenapiInitWorkflowDefinition,
  AddSchemaWorkflowDefinition,
  AddRouteWorkflowDefinition,
  AddEventWorkflowDefinition,
];

export default workflowDefinitions;
