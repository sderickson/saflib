// BEGIN WORKFLOW AREA workflow-imports FOR workflows/add-workflow
import { AddCLIWorkflowDefinition } from "./add-cli.ts";
import { AddCommandWorkflowDefinition } from "./add-command.ts";
// END WORKFLOW AREA
import type { WorkflowDefinition } from "@saflib/workflows";

export {
  // BEGIN WORKFLOW AREA workflow-exports FOR workflows/add-workflow
  AddCLIWorkflowDefinition,
  AddCommandWorkflowDefinition,
  // END WORKFLOW AREA
};

const workflowDefinitions: WorkflowDefinition[] = [
  // BEGIN WORKFLOW AREA workflow-array FOR workflows/add-workflow
  AddCLIWorkflowDefinition,
  AddCommandWorkflowDefinition,
  // END WORKFLOW AREA
];
export default workflowDefinitions;
