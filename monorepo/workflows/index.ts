import { AddTsPackageWorkflow } from "./add-ts-package.ts";
import type { ConcreteWorkflowRunner } from "@saflib/workflows";

const workflowClasses: ConcreteWorkflowRunner[] = [AddTsPackageWorkflow];

export default workflowClasses;
