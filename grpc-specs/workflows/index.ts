import { UpdateGrpcSpecWorkflow } from "./update-grpc-spec.ts";
import { AddProtoPackageWorkflow } from "./add-proto-package.ts";
import type { ConcreteWorkflow } from "@saflib/workflows";

const workflowClasses: ConcreteWorkflow[] = [
  UpdateGrpcSpecWorkflow,
  AddProtoPackageWorkflow,
];

export default workflowClasses;
