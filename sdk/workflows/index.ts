import { SdkInitWorkflowDefinition } from "./sdk/init.ts";
import type { WorkflowDefinition } from "@saflib/workflows";

export { SdkInitWorkflowDefinition };

const workflowDefinitions: WorkflowDefinition[] = [SdkInitWorkflowDefinition];
export default workflowDefinitions;
