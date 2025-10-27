import { CronInitWorkflowDefinition } from "./init.ts";
import { CronAddJobWorkflowDefinition } from "./add-job.ts";
import type { WorkflowDefinition } from "@saflib/workflows";

export {
  // Export each workflow definition separately
  CronInitWorkflowDefinition,
  CronAddJobWorkflowDefinition,
};

const CronWorkflowDefinitions: WorkflowDefinition[] = [
  // And have the default export be the array of all of them
  CronInitWorkflowDefinition,
  CronAddJobWorkflowDefinition,
];
export default CronWorkflowDefinitions;
