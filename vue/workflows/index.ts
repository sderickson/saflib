// BEGIN SORTED WORKFLOW AREA workflow-imports FOR workflows/add-workflow
import { AddE2eTestWorkflowDefinition } from "./add-e2e-test.ts";
import { AddSpaViewWorkflowDefinition } from "./add-view.ts";
import { AddSpaWorkflowDefinition } from "./add-spa.ts";
import { VueAddStaticSiteWorkflowDefinition } from "./add-static-site.ts";
// END WORKFLOW AREA

import type { WorkflowDefinition } from "@saflib/workflows";

export {
  // BEGIN SORTED WORKFLOW AREA workflow-exports FOR workflows/add-workflow
  AddE2eTestWorkflowDefinition,
  AddSpaViewWorkflowDefinition,
  AddSpaWorkflowDefinition,
  VueAddStaticSiteWorkflowDefinition,
  // END WORKFLOW AREA
};

const workflowDefinitions: WorkflowDefinition[] = [
  // BEGIN SORTED WORKFLOW AREA workflow-array FOR workflows/add-workflow
  AddE2eTestWorkflowDefinition,
  AddSpaViewWorkflowDefinition,
  AddSpaWorkflowDefinition,
  VueAddStaticSiteWorkflowDefinition,
  // END WORKFLOW AREA
];

export default workflowDefinitions;
