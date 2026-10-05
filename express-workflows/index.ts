import { AddHandlerWorkflowDefinition } from "./add-handler.ts";
import type { WorkflowDefinition } from "@saflib/new-workflows";

const workflows: WorkflowDefinition<any, any>[] = [AddHandlerWorkflowDefinition];

export { AddHandlerWorkflowDefinition };
export default workflows;
