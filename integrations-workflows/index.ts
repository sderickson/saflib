import { AddCallWorkflowDefinition } from "./add-call.ts";
import { InitIntegrationWorkflowDefinition } from "./init-integration.ts";
import type { WorkflowDefinition } from "@saflib/new-workflows";

const workflows: WorkflowDefinition<any, any>[] = [
  InitIntegrationWorkflowDefinition,
  AddCallWorkflowDefinition,
];

export { AddCallWorkflowDefinition, InitIntegrationWorkflowDefinition };
export default workflows;
