import { AddEnvVarWorkflowDefinition } from "./add-env-var.ts";
import type { WorkflowDefinition } from "@saflib/new-workflows";

const workflows: WorkflowDefinition<any, any>[] = [AddEnvVarWorkflowDefinition];

export { AddEnvVarWorkflowDefinition };
export default workflows;
