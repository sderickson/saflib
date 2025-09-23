import { SdkInitWorkflowDefinition } from "./init.ts";
import { AddQueryWorkflowDefinition } from "./add-query.ts";
import { AddComponentWorkflowDefinition } from "./add-component.ts";
import type { WorkflowDefinition } from "@saflib/workflows";

export {
  SdkInitWorkflowDefinition,
  AddQueryWorkflowDefinition,
  AddComponentWorkflowDefinition,
};

const workflowDefinitions: WorkflowDefinition[] = [
  SdkInitWorkflowDefinition,
  AddQueryWorkflowDefinition,
  AddComponentWorkflowDefinition,
];
export default workflowDefinitions;
