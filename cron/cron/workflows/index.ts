import { CronInitWorkflowDefinition } from "./init.ts";
import type { WorkflowDefinition } from "@saflib/workflows";

export {
  // Export each workflow definition separately
  CronInitWorkflowDefinition,
};

const CronWorkflowDefinitions: WorkflowDefinition[] = [
  // And have the default export be the array of all of them
  CronInitWorkflowDefinition,
];
export default CronWorkflowDefinitions;
