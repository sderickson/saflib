// BEGIN WORKFLOW AREA workflow-imports FOR workflows/add-workflow
import { JobsInitWorkflowDefinition } from "./init.ts";
import { JobsAddJobWorkflowDefinition } from "./add-job.ts";
// END WORKFLOW AREA
import type { WorkflowDefinition } from "@saflib/workflows";

export {
  // BEGIN WORKFLOW AREA workflow-exports FOR workflows/add-workflow
  JobsInitWorkflowDefinition,
  JobsAddJobWorkflowDefinition,
  // END WORKFLOW AREA
};

const JobsWorkflowDefinitions: WorkflowDefinition[] = [
  // BEGIN WORKFLOW AREA workflow-array FOR workflows/add-workflow
  JobsInitWorkflowDefinition,
  JobsAddJobWorkflowDefinition,
  // END WORKFLOW AREA
];

export default JobsWorkflowDefinitions;
