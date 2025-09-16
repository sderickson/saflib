import { OpenapiInitWorkflowDefinition } from "./init.ts";
import { AddSchemaWorkflowDefinition } from "./add-schema.ts";
import { AddRouteWorkflowDefinition } from "./add-route.ts";
import type { WorkflowDefinition } from "@saflib/workflows";

export {
  OpenapiInitWorkflowDefinition,
  AddSchemaWorkflowDefinition,
  AddRouteWorkflowDefinition,
};

const workflowDefinitions: WorkflowDefinition[] = [
  OpenapiInitWorkflowDefinition,
  AddSchemaWorkflowDefinition,
  AddRouteWorkflowDefinition,
];

export default workflowDefinitions;
