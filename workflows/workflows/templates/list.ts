/// <reference path="./template-shims.d.ts" />
import type { WorkflowDefinition } from "@saflib/workflows";

// BEGIN WORKFLOW AREA workflow-cli-imports FOR workflows/add-workflow
import __serviceName__Workflows from "template-package/workflows";
// END WORKFLOW AREA

const workflowClasses: WorkflowDefinition[] = [
  // BEGIN WORKFLOW AREA workflow-cli-spreads FOR workflows/add-workflow
  ...__serviceName__Workflows,
  // END WORKFLOW AREA
];

export const workflows = workflowClasses;
