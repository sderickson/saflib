import { AddQueryWorkflowDefinition } from "./add-query.ts";
import { UpdateSchemaWorkflowDefinition } from "./update-schema.ts";
import { InitWorkflowDefinition } from "./init.ts";
import type { WorkflowDefinition } from "@saflib/workflows";

const workflowDefinitions: WorkflowDefinition[] = [
  UpdateSchemaWorkflowDefinition,
  AddQueryWorkflowDefinition,
  InitWorkflowDefinition,
];

export {
  AddQueryWorkflowDefinition,
  UpdateSchemaWorkflowDefinition,
  InitWorkflowDefinition,
};

export default workflowDefinitions;
