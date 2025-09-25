import { InitGrpcServerWorkflowDefinition } from "./init-server.ts";
import { AddHandlerWorkflowDefinition } from "./add-handler.ts";
import type { WorkflowDefinition } from "@saflib/workflows";

export {
  // Export each workflow definition separately
  InitGrpcServerWorkflowDefinition,
  AddHandlerWorkflowDefinition,
};

const workflowDefinitions: WorkflowDefinition[] = [
  // And have the default export be the array of all of them
  InitGrpcServerWorkflowDefinition,
  AddHandlerWorkflowDefinition,
];
export default workflowDefinitions;
