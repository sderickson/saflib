import { AddE2eTestWorkflowDefinition } from "./add-e2e-test.ts";
import { AddSpaWorkflowDefinition } from "./add-spa.ts";
import { AddStaticSiteWorkflowDefinition } from "./add-static-site.ts";
import { AddSpaViewWorkflowDefinition, AddSpaPageWorkflowDefinition } from "./add-view.ts";
import type { WorkflowDefinition } from "@saflib/new-workflows";

const workflows: WorkflowDefinition<any, any>[] = [
  AddE2eTestWorkflowDefinition,
  AddSpaWorkflowDefinition,
  AddStaticSiteWorkflowDefinition,
  AddSpaViewWorkflowDefinition,
];

export {
  AddE2eTestWorkflowDefinition,
  AddSpaWorkflowDefinition,
  AddStaticSiteWorkflowDefinition,
  AddSpaViewWorkflowDefinition,
  AddSpaPageWorkflowDefinition,
};
export default workflows;
