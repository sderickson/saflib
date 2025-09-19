import { SdkInitWorkflowDefinition } from "./sdk/init.ts";
import { AddQueryWorkflowDefinition } from "./sdk/add-query.ts";
import type { WorkflowDefinition } from "@saflib/workflows";

export { SdkInitWorkflowDefinition, AddQueryWorkflowDefinition };

const workflowDefinitions: WorkflowDefinition[] = [
  SdkInitWorkflowDefinition,
  AddQueryWorkflowDefinition,
];
export default workflowDefinitions;
