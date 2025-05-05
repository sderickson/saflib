import { UpdateSchemaWorkflow } from "./update-schema.ts";
import { AddQueriesWorkflow } from "./add-queries.ts";
import type { ConcreteWorkflow } from "@saflib/workflows";

const workflowClasses: ConcreteWorkflow[] = [
  UpdateSchemaWorkflow,
  AddQueriesWorkflow,
];

export default workflowClasses;
