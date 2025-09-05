import type { ConcreteWorkflowRunner } from "@saflib/workflows";
import { AddEnvVarWorkflow } from "./add-env-var.ts";

const workflowClasses: ConcreteWorkflowRunner[] = [AddEnvVarWorkflow];

export default workflowClasses;
