import { AddCallWorkflowDefinition } from "./add-call.ts";
import type { WorkflowDefinition } from "@saflib/new-workflows";

const workflows: WorkflowDefinition<any, any>[] = [AddCallWorkflowDefinition];

export { AddCallWorkflowDefinition };
export default workflows;
