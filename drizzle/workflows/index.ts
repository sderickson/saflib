import { AddQueriesWorkflow } from "./add-queries.ts";
import { UpdateSchemaWorkflow } from "./update-schema.ts";
import type { ConcreteWorkflowRunner } from "@saflib/workflows";

const workflowClasses: ConcreteWorkflowRunner[] = [
  UpdateSchemaWorkflow,
  AddQueriesWorkflow,
];

export default workflowClasses;
