import { CronAddJobWorkflowDefinition } from "./add-job.ts";
import { CronInitWorkflowDefinition } from "./init.ts";
import type { WorkflowDefinition } from "@saflib/new-workflows";

const workflows: WorkflowDefinition<any, any>[] = [
  CronAddJobWorkflowDefinition,
  CronInitWorkflowDefinition,
];

export { CronAddJobWorkflowDefinition, CronInitWorkflowDefinition };
export default workflows;
