import { Monorepo/addExportWorkflowDefinition } from "./monorepo/add-export.ts";
import type { WorkflowDefinition } from "@saflib/workflows";

export {
  // Export each workflow definition separately
  Monorepo/addExportWorkflowDefinition,
};

const workflowDefinitions: WorkflowDefinition[] = [
  // And have the default export be the array of all of them
  Monorepo/addExportWorkflowDefinition,
];
export default workflowDefinitions;
