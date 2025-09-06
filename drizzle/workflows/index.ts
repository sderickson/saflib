import { AddQueryWorkflowDefinition } from "./add-query.ts";
import { UpdateSchemaWorkflowDefinition } from "./update-schema.ts";
import { InitWorkflowDefinition } from "./init.ts";
import type { WorkflowDefinition } from "@saflib/workflows-internal";

const workflowDefinitions: WorkflowDefinition[] = [
  UpdateSchemaWorkflowDefinition,
  AddQueryWorkflowDefinition,
  InitWorkflowDefinition,
];

export default workflowDefinitions;
