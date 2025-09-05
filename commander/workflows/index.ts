import { AddCLIWorkflow } from "./add-cli.ts";
import { AddCommandWorkflow } from "./add-command.ts";
import type { ConcreteWorkflowRunner } from "@saflib/workflows";

const workflowClasses: ConcreteWorkflowRunner[] = [
  AddCLIWorkflow,
  AddCommandWorkflow,
];

export default workflowClasses;
