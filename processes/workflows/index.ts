import { SpecProjectWorkflow } from "./spec-project.ts";
import type { ConcreteWorkflowRunner } from "@saflib/workflows";

const workflowClasses: ConcreteWorkflowRunner[] = [SpecProjectWorkflow];

export default workflowClasses;
