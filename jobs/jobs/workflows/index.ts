import { JobsInitWorkflowDefinition } from "./init.ts";
import { JobsAddJobWorkflowDefinition } from "./add-job.ts";
import type { WorkflowDefinition } from "@saflib/workflows";

export { JobsInitWorkflowDefinition, JobsAddJobWorkflowDefinition };

const JobsWorkflowDefinitions: WorkflowDefinition[] = [
  JobsInitWorkflowDefinition,
  JobsAddJobWorkflowDefinition,
];

export default JobsWorkflowDefinitions;
