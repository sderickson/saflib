// BEGIN WORKFLOW AREA workflow-imports FOR workflows/add-workflow
import { SentryInitWorkflowDefinition } from "./init.ts";
// END WORKFLOW AREA

import type { WorkflowDefinition } from "@saflib/workflows";

export {
  // BEGIN WORKFLOW AREA workflow-exports FOR workflows/add-workflow
  SentryInitWorkflowDefinition,
  // END WORKFLOW AREA
};

const SentryWorkflowDefinitions: WorkflowDefinition[] = [
  // BEGIN WORKFLOW AREA workflow-array FOR workflows/add-workflow
  SentryInitWorkflowDefinition,
  // END WORKFLOW AREA
];
export default SentryWorkflowDefinitions;
