import { AddGrpcHandlerWorkflow } from "./add-grpc-handler.ts";
import { AddGrpcServerWorkflow } from "./add-grpc-server.ts";
import type { ConcreteWorkflow } from "@saflib/workflows";

const workflowClasses: ConcreteWorkflow[] = [
  AddGrpcHandlerWorkflow,
  AddGrpcServerWorkflow,
];

export default workflowClasses;
