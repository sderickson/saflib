import { AddRouteWorkflow } from "./add-route.ts";
import type { ConcreteWorkflowRunner } from "@saflib/workflows";

const workflowClasses: ConcreteWorkflowRunner[] = [AddRouteWorkflow];

export default workflowClasses;
