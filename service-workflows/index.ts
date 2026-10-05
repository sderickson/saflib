import { ServiceAddStoreWorkflowDefinition } from "./add-store.ts";
import { InitCommonWorkflowDefinition } from "./init-common.ts";
import type { WorkflowDefinition } from "@saflib/new-workflows";

const workflows: WorkflowDefinition<any, any>[] = [
  ServiceAddStoreWorkflowDefinition,
  InitCommonWorkflowDefinition,
];

export { ServiceAddStoreWorkflowDefinition, InitCommonWorkflowDefinition };
export default workflows;
