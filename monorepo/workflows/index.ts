import { AddTsPackageWorkflowDefinition } from "./add-ts-package.ts";
import { AddExportWorkflowDefinition } from "./add-export.ts";
import type { WorkflowDefinition } from "@saflib/workflows";

const workflowDefinitions: WorkflowDefinition[] = [
  AddTsPackageWorkflowDefinition,
  AddExportWorkflowDefinition,
];

export default workflowDefinitions;
