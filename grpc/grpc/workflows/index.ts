import { InitWorkflowDefinition } from "./init.ts";
import { AddHandlerWorkflowDefinition } from "./add-handler.ts";
import type { WorkflowDefinition } from "@saflib/workflows";

export {
  // Export each workflow definition separately
  InitWorkflowDefinition,
  AddHandlerWorkflowDefinition,
};

const workflowDefinitions: WorkflowDefinition[] = [
  // And have the default export be the array of all of them
  InitWorkflowDefinition,
  AddHandlerWorkflowDefinition,
];
export default workflowDefinitions;
