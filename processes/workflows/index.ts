import { SpecProjectWorkflowDefinition } from "./spec-project.ts";
import type { WorkflowDefinition } from "@saflib/workflows-internal";

const workflowDefinitions: WorkflowDefinition[] = [
  SpecProjectWorkflowDefinition,
];

export default workflowDefinitions;
