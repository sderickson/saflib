// BEGIN WORKFLOW AREA workflow-imports FOR workflows/add-workflow
import { AddE2eTestWorkflowDefinition } from "./add-e2e-test.ts";
import { AddSpaViewWorkflowDefinition } from "./add-view.ts";
import { AddSpaWorkflowDefinition } from "./add-spa.ts";
import { AddStaticSiteWorkflowDefinition } from "./add-static-site.ts";
// END WORKFLOW AREA

import type { WorkflowDefinition } from "@saflib/workflows";

export {
  // BEGIN WORKFLOW AREA workflow-exports FOR workflows/add-workflow
  AddE2eTestWorkflowDefinition,
  AddSpaViewWorkflowDefinition,
  AddSpaWorkflowDefinition,
  AddStaticSiteWorkflowDefinition,
  // END WORKFLOW AREA
};

const workflowDefinitions: WorkflowDefinition[] = [
  // BEGIN WORKFLOW AREA workflow-array FOR workflows/add-workflow
  AddE2eTestWorkflowDefinition,
  AddSpaViewWorkflowDefinition,
  AddSpaWorkflowDefinition,
  AddStaticSiteWorkflowDefinition,
  // END WORKFLOW AREA
];

export default workflowDefinitions;
