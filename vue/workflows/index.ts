import { AddSpaWorkflow } from "./add-spa.ts";
import { AddSpaPageWorkflow } from "./add-spa-page.ts";
import type { ConcreteWorkflow } from "@saflib/workflows";

const workflowClasses: ConcreteWorkflow[] = [
  AddSpaWorkflow,
  AddSpaPageWorkflow,
];

export default workflowClasses;
