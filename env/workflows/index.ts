import type { WorkflowDefinition } from "@saflib/workflows-internal";
import { AddEnvVarWorkflowDefinition } from "./add-env-var.ts";

const workflowDefinitions: WorkflowDefinition[] = [AddEnvVarWorkflowDefinition];

export default workflowDefinitions;
