// BEGIN WORKFLOW AREA workflow-imports FOR workflows/add-workflow
import { SdkInitWorkflowDefinition } from "./init.ts";
import { AddSdkQueryWorkflowDefinition } from "./add-query.ts";
import { AddSdkMutationWorkflowDefinition } from "./add-mutation.ts";
import { AddComponentWorkflowDefinition } from "./add-component.ts";
// END WORKFLOW AREA
import type { WorkflowDefinition } from "@saflib/workflows";

export {
  // BEGIN WORKFLOW AREA workflow-exports FOR workflows/add-workflow
  SdkInitWorkflowDefinition,
  AddSdkQueryWorkflowDefinition,
  AddSdkMutationWorkflowDefinition,
  AddComponentWorkflowDefinition,
  // END WORKFLOW AREA
};

const workflowDefinitions: WorkflowDefinition[] = [
  // BEGIN WORKFLOW AREA workflow-array FOR workflows/add-workflow
  SdkInitWorkflowDefinition,
  AddSdkQueryWorkflowDefinition,
  AddSdkMutationWorkflowDefinition,
  AddComponentWorkflowDefinition,
  // END WORKFLOW AREA
];
export default workflowDefinitions;
