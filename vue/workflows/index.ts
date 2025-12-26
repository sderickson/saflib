import { AddSpaWorkflowDefinition } from "./add-spa.ts";
import { AddSpaPageWorkflowDefinition } from "./add-page.ts";
import { AddE2eTestWorkflowDefinition } from "./add-e2e-test.ts";
import type { WorkflowDefinition } from "@saflib/workflows";

export {
  AddSpaWorkflowDefinition,
  AddSpaPageWorkflowDefinition,
  AddE2eTestWorkflowDefinition,
};

const workflowDefinitions: WorkflowDefinition[] = [
  AddSpaWorkflowDefinition,
  AddSpaPageWorkflowDefinition,
  AddE2eTestWorkflowDefinition,
];

export default workflowDefinitions;
