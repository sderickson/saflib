import { AddTestsWorkflow } from "./add-tests.ts";
import { AddTestsWorkflowXState } from "./add-tests-xstate.ts";
import { SplitFileWorkflow } from "./split-file.ts";
import type { ConcreteWorkflow } from "@saflib/workflows";

const workflowClasses: ConcreteWorkflow[] = [
  AddTestsWorkflow,
  SplitFileWorkflow,
  AddTestsWorkflowXState,
];

export default workflowClasses;
