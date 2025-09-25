import { InitGrpcServerWorkflowDefinition } from "./init-server.ts";
import { AddGrpcServerHandlerWorkflowDefinition } from "./add-handler.ts";
import type { WorkflowDefinition } from "@saflib/workflows";

export {
  // Export each workflow definition separately
  InitGrpcServerWorkflowDefinition,
  AddGrpcServerHandlerWorkflowDefinition,
};

const workflowDefinitions: WorkflowDefinition[] = [
  // And have the default export be the array of all of them
  InitGrpcServerWorkflowDefinition,
  AddGrpcServerHandlerWorkflowDefinition,
];
export default workflowDefinitions;
