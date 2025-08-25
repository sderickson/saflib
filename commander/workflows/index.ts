import { AddCLIWorkflow } from "./add-cli.ts";
import { AddCommandWorkflow } from "./add-command.ts";
import type { ConcreteWorkflow } from "@saflib/workflows";

const workflowClasses: ConcreteWorkflow[] = [
  AddCLIWorkflow,
  AddCommandWorkflow,
];

export default workflowClasses;
