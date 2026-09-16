import { JobsAddJobWorkflowDefinition } from "./add-job.ts";
import type { WorkflowDefinition } from "@saflib/new-workflows";

const workflows: WorkflowDefinition<any, any>[] = [JobsAddJobWorkflowDefinition];

export { JobsAddJobWorkflowDefinition };
export default workflows;
