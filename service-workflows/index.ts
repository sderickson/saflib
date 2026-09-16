import { ServiceAddStoreWorkflowDefinition } from "./add-store.ts";
import { InitCommonWorkflowDefinition } from "./init-common.ts";
import type { WorkflowDefinition } from "@saflib/new-workflows";

// `InitCommonWorkflowDefinition` is exported but deliberately NOT in the
// default registry — see the KNOWN BROKEN comment in init-common.ts. It
// throws on a fresh copy due to a pre-existing template/workflow coupling
// issue unrelated to this port, so it isn't wired into dev-site until
// that's fixed.
const workflows: WorkflowDefinition<any, any>[] = [ServiceAddStoreWorkflowDefinition];

export { ServiceAddStoreWorkflowDefinition, InitCommonWorkflowDefinition };
export default workflows;
