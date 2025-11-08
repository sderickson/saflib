import { InitServiceWorkflowDefinition } from "./init.ts";
import type { WorkflowDefinition } from "@saflib/workflows";

export {
  // Export each workflow definition separately
  InitServiceWorkflowDefinition,
};

const workflowDefinitions: WorkflowDefinition[] = [
  // And have the default export be the array of all of them
  InitServiceWorkflowDefinition,
];
export default workflowDefinitions;
