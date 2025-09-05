import { AddWorkflow } from "./add-workflow.ts";
import type { ConcreteWorkflowRunner } from "@saflib/workflows";

const workflowClasses: ConcreteWorkflowRunner[] = [AddWorkflow];

export default workflowClasses;
