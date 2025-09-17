import { IdentityInitWorkflowDefinition } from "./identity/init.ts";
import type { WorkflowDefinition } from "@saflib/workflows";

export {
  // Export each workflow definition separately
  IdentityInitWorkflowDefinition,
};

const workflowDefinitions: WorkflowDefinition[] = [
  // And have the default export be the array of all of them
  IdentityInitWorkflowDefinition,
];
export default workflowDefinitions;
