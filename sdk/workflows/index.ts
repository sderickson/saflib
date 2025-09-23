import { SdkInitWorkflowDefinition } from "./init.ts";
import { AddQueryWorkflowDefinition } from "./add-query.ts";
import type { WorkflowDefinition } from "@saflib/workflows";

export { SdkInitWorkflowDefinition, AddQueryWorkflowDefinition };

const workflowDefinitions: WorkflowDefinition[] = [
  SdkInitWorkflowDefinition,
  AddQueryWorkflowDefinition,
];
export default workflowDefinitions;
