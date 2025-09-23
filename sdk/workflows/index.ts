import { SdkInitWorkflowDefinition } from "./init.ts";
import { AddQueryWorkflowDefinition } from "./add-query.ts";
import { AddDisplayWorkflowDefinition } from "./add-display.ts";
import type { WorkflowDefinition } from "@saflib/workflows";

export {
  SdkInitWorkflowDefinition,
  AddQueryWorkflowDefinition,
  AddDisplayWorkflowDefinition,
};

const workflowDefinitions: WorkflowDefinition[] = [
  SdkInitWorkflowDefinition,
  AddQueryWorkflowDefinition,
  AddDisplayWorkflowDefinition,
];
export default workflowDefinitions;
