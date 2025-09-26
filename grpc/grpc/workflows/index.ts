import { InitGrpcServerWorkflowDefinition } from "./init-server.ts";
import { AddGrpcServerHandlerWorkflowDefinition } from "./add-handler.ts";
import { InitGrpcProtoWorkflowDefinition } from "./init-proto.ts";
import { AddProtoWorkflowDefinition } from "./add-proto.ts";
import { InitGrpcClientWorkflowDefinition } from "./init-client.ts";
import { AddRpcWorkflowDefinition } from "./add-rpc.ts";
import type { WorkflowDefinition } from "@saflib/workflows";

export {
  // Export each workflow definition separately
  InitGrpcServerWorkflowDefinition,
  AddGrpcServerHandlerWorkflowDefinition,
  InitGrpcProtoWorkflowDefinition,
  AddProtoWorkflowDefinition,
  InitGrpcClientWorkflowDefinition,
  AddRpcWorkflowDefinition,
};

const workflowDefinitions: WorkflowDefinition[] = [
  // And have the default export be the array of all of them
  InitGrpcServerWorkflowDefinition,
  AddGrpcServerHandlerWorkflowDefinition,
  InitGrpcProtoWorkflowDefinition,
  AddProtoWorkflowDefinition,
  InitGrpcClientWorkflowDefinition,
  AddRpcWorkflowDefinition,
];
export default workflowDefinitions;
