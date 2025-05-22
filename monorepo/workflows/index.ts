import { AddTsPackageWorkflow } from "./add-ts-package.ts";
import { UpdateImplWorkflow } from "./update-impl.ts";
import type { ConcreteWorkflow } from "@saflib/workflows";

const workflowClasses: ConcreteWorkflow[] = [
  AddTsPackageWorkflow,
  UpdateImplWorkflow,
];

export default workflowClasses;
