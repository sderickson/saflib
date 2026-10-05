import { AddExportWorkflowDefinition } from "./add-export.ts";
import { AddTsPackageWorkflowDefinition } from "./add-ts-package.ts";
import type { WorkflowDefinition } from "@saflib/new-workflows";

const workflows: WorkflowDefinition<any, any>[] = [
  AddExportWorkflowDefinition,
  AddTsPackageWorkflowDefinition,
];

export { AddExportWorkflowDefinition, AddTsPackageWorkflowDefinition };
export default workflows;
