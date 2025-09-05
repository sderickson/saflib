import { UpdateSpecWorkflow } from "./update-spec.ts";
import type { ConcreteWorkflowRunner } from "@saflib/workflows";

const workflowClasses: ConcreteWorkflowRunner[] = [UpdateSpecWorkflow];

export default workflowClasses;
