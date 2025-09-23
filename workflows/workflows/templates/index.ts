import { __TargetName__WorkflowDefinition } from "./__target-name__.ts";
import type { WorkflowDefinition } from "@saflib/workflows";

export {
  // Export each workflow definition separately
  __TargetName__WorkflowDefinition,
};

const workflowDefinitions: WorkflowDefinition[] = [
  // And have the default export be the array of all of them
  __TargetName__WorkflowDefinition,
];
export default workflowDefinitions;
