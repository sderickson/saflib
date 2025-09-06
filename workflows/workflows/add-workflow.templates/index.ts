import { TemplateFileWorkflowDefinition } from "./template-file.ts";
import type { WorkflowDefinition } from "@saflib/workflows-internal";

const workflowDefinitions: WorkflowDefinition[] = [
  TemplateFileWorkflowDefinition,
];

export default workflowDefinitions;
