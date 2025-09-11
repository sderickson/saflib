import { InitWorkflowDefinition } from "./init.ts";
import { AddSchemaWorkflowDefinition } from "./add-schema.ts";
import { AddRouteWorkflowDefinition } from "./add-route.ts";
import type { WorkflowDefinition } from "@saflib/workflows";

export {
  InitWorkflowDefinition,
  AddSchemaWorkflowDefinition,
  AddRouteWorkflowDefinition,
};

const workflowDefinitions: WorkflowDefinition[] = [
  InitWorkflowDefinition,
  AddSchemaWorkflowDefinition,
  AddRouteWorkflowDefinition,
];

export default workflowDefinitions;
