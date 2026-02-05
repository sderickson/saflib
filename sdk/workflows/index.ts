import { SdkInitWorkflowDefinition } from "./init.ts";
import { AddSdkQueryWorkflowDefinition } from "./add-query.ts";
import { AddSdkMutationWorkflowDefinition } from "./add-mutation.ts";
import { AddComponentWorkflowDefinition } from "./add-component.ts";
import type { WorkflowDefinition } from "@saflib/workflows";

export {
  SdkInitWorkflowDefinition,
  AddSdkQueryWorkflowDefinition,
  AddSdkMutationWorkflowDefinition,
  AddComponentWorkflowDefinition,
};

const workflowDefinitions: WorkflowDefinition[] = [
  SdkInitWorkflowDefinition,
  AddSdkQueryWorkflowDefinition,
  AddSdkMutationWorkflowDefinition,
  AddComponentWorkflowDefinition,
];
export default workflowDefinitions;
