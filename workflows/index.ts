import type { WorkflowMeta, ConcreteWorkflow } from "./src/workflow.ts";

export * from "./src/workflow.ts";
export * from "./src/workflow-cli.ts";
import sampleWorkflows from "./sample/index.ts";
export { sampleWorkflows };
export type * from "./src/types.ts";
export * from "./src/utils.ts";

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

export * from "./src/xstate.ts";
export * from "./src/copy-template-machine.ts";
export * from "./src/test-runner.ts";
export * from "./src/chain.ts";
