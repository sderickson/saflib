import { AddSpaWorkflowDefinition } from "./add-spa.ts";
import { AddSpaPageWorkflowDefinition } from "./add-spa-page.ts";
import type { WorkflowDefinition } from "@saflib/workflows";

const workflowDefinitions: WorkflowDefinition[] = [
  AddSpaWorkflowDefinition,
  AddSpaPageWorkflowDefinition,
];

export default workflowDefinitions;
