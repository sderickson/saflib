import { TemplateFileWorkflowDefinition } from "./template-file.ts";
import type { WorkflowDefinition } from "@saflib/workflows";

export {
  // Export each workflow definition separately
  TemplateFileWorkflowDefinition,
};

const workflowDefinitions: WorkflowDefinition[] = [
  // And have the default export be the array of all of them
  TemplateFileWorkflowDefinition,
];
export default workflowDefinitions;
