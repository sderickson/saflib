import { ServiceAddStoreWorkflowDefinition } from "./add-store.ts";
import type { WorkflowDefinition } from "@saflib/new-workflows";

const workflows: WorkflowDefinition<any, any>[] = [ServiceAddStoreWorkflowDefinition];

export { ServiceAddStoreWorkflowDefinition };
export default workflows;
