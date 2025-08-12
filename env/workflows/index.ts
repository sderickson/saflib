import type { ConcreteWorkflow } from "@saflib/workflows";
import { AddEnvVarWorkflow } from "./add-env-var.ts";

const workflowClasses: ConcreteWorkflow[] = [AddEnvVarWorkflow];

export default workflowClasses;
