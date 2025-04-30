import { AddWorkflow } from "./add-workflow.js"; // Use .js extension for ESM compatibility
import type { ConcreteWorkflow } from "@saflib/workflows";

const workflowClasses: ConcreteWorkflow[] = [AddWorkflow];

export default workflowClasses;
