import { AddComponentWorkflowDefinition } from "./add-component.ts";
import { AddSdkMutationWorkflowDefinition } from "./add-mutation.ts";
import { AddSdkQueryWorkflowDefinition } from "./add-query.ts";
import type { WorkflowDefinition } from "@saflib/new-workflows";

const workflows: WorkflowDefinition<any, any>[] = [
  AddComponentWorkflowDefinition,
  AddSdkMutationWorkflowDefinition,
  AddSdkQueryWorkflowDefinition,
];

export { AddComponentWorkflowDefinition, AddSdkMutationWorkflowDefinition, AddSdkQueryWorkflowDefinition };
export default workflows;
