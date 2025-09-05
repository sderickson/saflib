import { AddQueryWorkflowDefinition } from "./add-query.ts";
import { UpdateSchemaWorkflowDefinition } from "./update-schema.ts";
import type { WorkflowDefinition } from "@saflib/workflows";

const workflowDefinitions: WorkflowDefinition[] = [
  UpdateSchemaWorkflowDefinition,
  AddQueryWorkflowDefinition,
];

export default workflowDefinitions;
