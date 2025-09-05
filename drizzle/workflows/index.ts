import { AddQueriesWorkflowDefinition } from "./add-queries.ts";
import { UpdateSchemaWorkflowDefinition } from "./update-schema.ts";
import type { WorkflowDefinition } from "@saflib/workflows";

const workflowDefinitions: WorkflowDefinition[] = [
  UpdateSchemaWorkflowDefinition,
  AddQueriesWorkflowDefinition,
];

export default workflowDefinitions;
