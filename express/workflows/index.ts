import { AddHandlerWorkflowDefinition } from "./add-handler.ts";
import { ExpressInitWorkflowDefinition } from "./init.ts";
import type { WorkflowDefinition } from "@saflib/workflows";

export { AddHandlerWorkflowDefinition, ExpressInitWorkflowDefinition };

const workflowDefinitions: WorkflowDefinition[] = [
  AddHandlerWorkflowDefinition,
  ExpressInitWorkflowDefinition,
];

export default workflowDefinitions;
