import { InitProductWorkflowDefinition } from "./init.ts";
import type { WorkflowDefinition } from "@saflib/workflows";

export {
  InitProductWorkflowDefinition,
};

const ProductWorkflowDefinitions: WorkflowDefinition[] = [
  InitProductWorkflowDefinition,
];
export default ProductWorkflowDefinitions;
