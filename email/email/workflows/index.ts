import { AddEmailTemplateWorkflow } from "./add-email-template.ts";
import type { ConcreteWorkflowRunner } from "@saflib/workflows";

const workflowClasses: ConcreteWorkflowRunner[] = [AddEmailTemplateWorkflow];

export default workflowClasses;
