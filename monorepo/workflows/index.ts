// BEGIN WORKFLOW AREA workflow-imports FOR workflows/add-workflow
import { AddTsPackageWorkflowDefinition } from "./add-ts-package.ts";
import { AddExportWorkflowDefinition } from "./add-export.ts";
// END WORKFLOW AREA
import type { WorkflowDefinition } from "@saflib/workflows";

export {
  // BEGIN WORKFLOW AREA workflow-exports FOR workflows/add-workflow
  AddTsPackageWorkflowDefinition,
  AddExportWorkflowDefinition,
  // END WORKFLOW AREA
};

const workflowDefinitions: WorkflowDefinition[] = [
  // BEGIN WORKFLOW AREA workflow-array FOR workflows/add-workflow
  AddTsPackageWorkflowDefinition,
  AddExportWorkflowDefinition,
  // END WORKFLOW AREA
];

export default workflowDefinitions;
