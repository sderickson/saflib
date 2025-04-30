import type { WorkflowMeta, ConcreteWorkflow } from "./src/workflow.ts";

export * from "./src/workflow.ts";
export * from "./src/workflow-cli.ts";
export * from "./sample/index.ts";
export type * from "./src/types.ts";

export function concreteWorkflowToMeta(
  workflow: ConcreteWorkflow,
): WorkflowMeta {
  const stubWorkflow = new workflow();
  return {
    name: stubWorkflow.name,
    description: stubWorkflow.description,
    cliArguments: stubWorkflow.cliArguments,
    Workflow: workflow,
  };
}
