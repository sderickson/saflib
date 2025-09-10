import { UpdateSpecWorkflowDefinition } from "./update-spec.ts";
import { InitWorkflowDefinition } from "./init.ts";
import type { WorkflowDefinition } from "@saflib/workflows";

const workflowDefinitions: WorkflowDefinition[] = [
  UpdateSpecWorkflowDefinition,
  InitWorkflowDefinition,
];

export default workflowDefinitions;
