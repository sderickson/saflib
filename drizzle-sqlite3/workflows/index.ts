import { AddQueriesWorkflow } from "./add-queries.ts";
import { UpdateSchemaWorkflow } from "./update-schema-xstate.ts";
import type { ConcreteWorkflow } from "@saflib/workflows";

const workflowClasses: ConcreteWorkflow[] = [
  // UpdateSchemaWorkflow,
  AddQueriesWorkflow,
  UpdateSchemaWorkflow,
];

export default workflowClasses;
