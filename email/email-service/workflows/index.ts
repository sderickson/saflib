// BEGIN WORKFLOW AREA workflow-imports FOR workflows/add-workflow
import { AddEmailTemplateWorkflowDefinition } from "./add-email-template.ts";
// END WORKFLOW AREA
import type { WorkflowDefinition } from "@saflib/workflows";

export {
  // BEGIN WORKFLOW AREA workflow-exports FOR workflows/add-workflow
  AddEmailTemplateWorkflowDefinition,
  // END WORKFLOW AREA
};

const workflowDefinitions: WorkflowDefinition[] = [
  // BEGIN WORKFLOW AREA workflow-array FOR workflows/add-workflow
  AddEmailTemplateWorkflowDefinition,
  // END WORKFLOW AREA
];

export default workflowDefinitions;
