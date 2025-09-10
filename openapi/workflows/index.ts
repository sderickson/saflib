import { UpdateSpecWorkflowDefinition } from "./update-spec.ts";
import { InitWorkflowDefinition } from "./init.ts";
import { AddSchemaWorkflowDefinition } from "./add-schema.ts";
import type { WorkflowDefinition } from "@saflib/workflows";

const workflowDefinitions: WorkflowDefinition[] = [
  UpdateSpecWorkflowDefinition,
  InitWorkflowDefinition,
  AddSchemaWorkflowDefinition,
];

export default workflowDefinitions;
