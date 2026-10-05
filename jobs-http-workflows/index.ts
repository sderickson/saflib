import { JobsAddJobWorkflowDefinition } from "./add-job.ts";
import { JobsInitWorkflowDefinition } from "./init.ts";
import type { WorkflowDefinition } from "@saflib/new-workflows";

const workflows: WorkflowDefinition<any, any>[] = [
  JobsAddJobWorkflowDefinition,
  JobsInitWorkflowDefinition,
];

export { JobsAddJobWorkflowDefinition, JobsInitWorkflowDefinition };
export default workflows;
