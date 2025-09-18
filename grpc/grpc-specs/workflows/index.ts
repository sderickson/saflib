import { InitWorkflowDefinition } from "./init.ts";
import { AddMethodWorkflowDefinition } from "./add-method.ts";
import type { WorkflowDefinition } from "@saflib/workflows";

export {
  // Export each workflow definition separately
  InitWorkflowDefinition,
  AddMethodWorkflowDefinition,
};

const workflowDefinitions: WorkflowDefinition[] = [
  // And have the default export be the array of all of them
  InitWorkflowDefinition,
  AddMethodWorkflowDefinition,
];
export default workflowDefinitions;
