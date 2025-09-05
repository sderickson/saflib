import { AddSpaWorkflow } from "./add-spa.ts";
import { AddSpaPageWorkflow } from "./add-spa-page.ts";
import type { ConcreteWorkflowRunner } from "@saflib/workflows";

const workflowClasses: ConcreteWorkflowRunner[] = [
  AddSpaWorkflow,
  AddSpaPageWorkflow,
];

export default workflowClasses;
