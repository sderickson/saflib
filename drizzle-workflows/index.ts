import { AddDrizzleQueryWorkflowDefinition } from "./add-query.ts";
import { UpdateSchemaWorkflowDefinition } from "./update-schema.ts";
import type { WorkflowDefinition } from "@saflib/new-workflows";

const workflows: WorkflowDefinition<any, any>[] = [
  AddDrizzleQueryWorkflowDefinition,
  UpdateSchemaWorkflowDefinition,
];

export { AddDrizzleQueryWorkflowDefinition, UpdateSchemaWorkflowDefinition };
export default workflows;
