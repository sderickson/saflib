import { InitProductWorkflowDefinition } from "./init.ts";
import type { WorkflowDefinition } from "@saflib/new-workflows";

const workflows: WorkflowDefinition<any, any>[] = [InitProductWorkflowDefinition];

export { InitProductWorkflowDefinition };
export default workflows;
