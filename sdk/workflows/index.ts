import { SdkInitWorkflowDefinition } from "./init.ts";
import { AddSdkQueryWorkflowDefinition } from "./add-query.ts";
import { AddComponentWorkflowDefinition } from "./add-component.ts";
import type { WorkflowDefinition } from "@saflib/workflows";

export {
  SdkInitWorkflowDefinition,
  AddSdkQueryWorkflowDefinition,
  AddComponentWorkflowDefinition,
};

const workflowDefinitions: WorkflowDefinition[] = [
  SdkInitWorkflowDefinition,
  AddSdkQueryWorkflowDefinition,
  AddComponentWorkflowDefinition,
];
export default workflowDefinitions;
