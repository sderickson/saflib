import { SpecProjectWorkflowDefinition } from "./spec-project.ts";
import type { WorkflowDefinition } from "@saflib/new-workflows";

const workflows: WorkflowDefinition<any, any>[] = [SpecProjectWorkflowDefinition];

export { SpecProjectWorkflowDefinition };
export default workflows;
