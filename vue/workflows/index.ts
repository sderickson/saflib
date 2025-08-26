import { AddSpaWorkflow } from "./add-spa.ts";
import { AddSpaPageWorkflow } from "./add-spa-page.ts";
import { AddTanstackQueriesWorkflow } from "./add-tanstack-queries.ts";
import type { ConcreteWorkflow } from "@saflib/workflows";

const workflowClasses: ConcreteWorkflow[] = [
  AddSpaWorkflow,
  AddSpaPageWorkflow,
  AddTanstackQueriesWorkflow,
];

export default workflowClasses;
