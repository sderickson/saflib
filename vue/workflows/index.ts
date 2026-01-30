import { AddSpaWorkflowDefinition } from "./add-spa.ts";
import { AddSpaViewWorkflowDefinition, AddSpaPageWorkflowDefinition } from "./add-view.ts";
import { AddE2eTestWorkflowDefinition } from "./add-e2e-test.ts";
import type { WorkflowDefinition } from "@saflib/workflows";

export {
  AddSpaWorkflowDefinition,
  AddSpaViewWorkflowDefinition,
  AddSpaPageWorkflowDefinition,
  AddE2eTestWorkflowDefinition,
};

const workflowDefinitions: WorkflowDefinition[] = [
  AddSpaWorkflowDefinition,
  AddSpaViewWorkflowDefinition,
  AddE2eTestWorkflowDefinition,
];

export default workflowDefinitions;
