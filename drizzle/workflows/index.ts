import { AddQueryWorkflowDefinition } from "./add-queries.ts";
import { UpdateSchemaWorkflowDefinition } from "./update-schema.ts";
import type { WorkflowDefinition } from "@saflib/workflows";

const workflowDefinitions: WorkflowDefinition[] = [
  UpdateSchemaWorkflowDefinition,
  AddQueryWorkflowDefinition,
];

export default workflowDefinitions;
