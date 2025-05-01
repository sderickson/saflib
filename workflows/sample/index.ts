import { AddTestsWorkflow } from "./add-tests.ts";
import { SplitFileWorkflow } from "./split-file.ts";
import type { ConcreteWorkflow } from "@saflib/workflows";

const workflowClasses: ConcreteWorkflow[] = [
  AddTestsWorkflow,
  SplitFileWorkflow,
];

export default workflowClasses;
