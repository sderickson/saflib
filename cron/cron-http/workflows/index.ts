// BEGIN WORKFLOW AREA workflow-imports FOR workflows/add-workflow
import { CronInitWorkflowDefinition } from "./init.ts";
import { CronAddJobWorkflowDefinition } from "./add-job.ts";
// END WORKFLOW AREA
import type { WorkflowDefinition } from "@saflib/workflows";

export {
  // BEGIN WORKFLOW AREA workflow-exports FOR workflows/add-workflow
  CronInitWorkflowDefinition,
  CronAddJobWorkflowDefinition,
  // END WORKFLOW AREA
};

const CronWorkflowDefinitions: WorkflowDefinition[] = [
  // BEGIN WORKFLOW AREA workflow-array FOR workflows/add-workflow
  CronInitWorkflowDefinition,
  CronAddJobWorkflowDefinition,
  // END WORKFLOW AREA
];
export default CronWorkflowDefinitions;
