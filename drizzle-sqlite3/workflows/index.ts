import { AddQueriesWorkflow } from "./add-queries.ts";
import { UpdateSchemaWorkflow } from "./update-schema.ts";
import type { ConcreteWorkflow } from "@saflib/workflows";

const workflowClasses: ConcreteWorkflow[] = [
  AddQueriesWorkflow,
  UpdateSchemaWorkflow,
];

export default workflowClasses;
