import { OpenApiRouteWorkflowDefinition } from "./add-route.ts";
import { OpenApiSchemaWorkflowDefinition } from "./add-schema.ts";
import { AddEventWorkflowDefinition } from "./add-event.ts";
import type { WorkflowDefinition } from "@saflib/new-workflows";

const workflows: WorkflowDefinition<any, any>[] = [
  OpenApiRouteWorkflowDefinition,
  OpenApiSchemaWorkflowDefinition,
  AddEventWorkflowDefinition,
];

export { OpenApiRouteWorkflowDefinition, OpenApiSchemaWorkflowDefinition, AddEventWorkflowDefinition };
export default workflows;
