import { CronAddJobWorkflowDefinition } from "./add-job.ts";
import type { WorkflowDefinition } from "@saflib/new-workflows";

const workflows: WorkflowDefinition<any, any>[] = [CronAddJobWorkflowDefinition];

export { CronAddJobWorkflowDefinition };
export default workflows;
