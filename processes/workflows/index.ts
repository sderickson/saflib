import { SpecProjectWorkflowDefinition } from "./spec-project.ts";
import type { WorkflowDefinition } from "@saflib/workflows";

export {
  SpecProjectWorkflowDefinition,
}

const workflowDefinitions: WorkflowDefinition[] = [
  SpecProjectWorkflowDefinition,
];

export default workflowDefinitions;
