// BEGIN WORKFLOW AREA workflow-imports FOR workflows/add-workflow
import { AddDrizzleQueryWorkflowDefinition } from "./add-query.ts";
import { UpdateSchemaWorkflowDefinition } from "./update-schema.ts";
import { DrizzleInitWorkflowDefinition } from "./init.ts";
// END WORKFLOW AREA
import type { WorkflowDefinition } from "@saflib/workflows";

export {
  // BEGIN WORKFLOW AREA workflow-exports FOR workflows/add-workflow
  AddDrizzleQueryWorkflowDefinition,
  UpdateSchemaWorkflowDefinition,
  DrizzleInitWorkflowDefinition,
  // END WORKFLOW AREA
};

const workflowDefinitions: WorkflowDefinition[] = [
  // BEGIN WORKFLOW AREA workflow-array FOR workflows/add-workflow
  UpdateSchemaWorkflowDefinition,
  AddDrizzleQueryWorkflowDefinition,
  DrizzleInitWorkflowDefinition,
  // END WORKFLOW AREA
];

export default workflowDefinitions;
