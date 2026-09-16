import { AddCLIWorkflowDefinition } from "./add-cli.ts";
import { AddCommandWorkflowDefinition } from "./add-command.ts";
import type { WorkflowDefinition } from "@saflib/new-workflows";

const workflows: WorkflowDefinition<any, any>[] = [
  AddCLIWorkflowDefinition,
  AddCommandWorkflowDefinition,
];

export { AddCLIWorkflowDefinition, AddCommandWorkflowDefinition };
export default workflows;
