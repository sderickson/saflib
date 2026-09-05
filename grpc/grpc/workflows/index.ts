// BEGIN WORKFLOW AREA workflow-imports FOR workflows/add-workflow
import { InitGrpcServerWorkflowDefinition } from "./init-server.ts";
import { AddGrpcServerHandlerWorkflowDefinition } from "./add-handler.ts";
import { InitGrpcProtoWorkflowDefinition } from "./init-proto.ts";
import { AddProtoWorkflowDefinition } from "./add-proto.ts";
import { InitGrpcClientWorkflowDefinition } from "./init-client.ts";
import { AddGrpcCallWorkflowDefinition } from "./add-rpc.ts";
// END WORKFLOW AREA
import type { WorkflowDefinition } from "@saflib/workflows";

export {
  // BEGIN WORKFLOW AREA workflow-exports FOR workflows/add-workflow
  InitGrpcServerWorkflowDefinition,
  AddGrpcServerHandlerWorkflowDefinition,
  InitGrpcProtoWorkflowDefinition,
  AddProtoWorkflowDefinition,
  InitGrpcClientWorkflowDefinition,
  AddGrpcCallWorkflowDefinition,
  // END WORKFLOW AREA
};

const workflowDefinitions: WorkflowDefinition[] = [
  // BEGIN WORKFLOW AREA workflow-array FOR workflows/add-workflow
  InitGrpcServerWorkflowDefinition,
  AddGrpcServerHandlerWorkflowDefinition,
  InitGrpcProtoWorkflowDefinition,
  AddProtoWorkflowDefinition,
  InitGrpcClientWorkflowDefinition,
  AddGrpcCallWorkflowDefinition,
  // END WORKFLOW AREA
];
export default workflowDefinitions;
