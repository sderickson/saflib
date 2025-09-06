import { TemplateFileWorkflowDefinition } from "./template-file.ts";
import type { WorkflowDefinition } from "@saflib/workflows";

const workflowDefinitions: WorkflowDefinition[] = [
  TemplateFileWorkflowDefinition,
];

export default workflowDefinitions;
