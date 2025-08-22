import {
  getPackageName,
  type WorkflowMeta,
  type ConcreteWorkflow,
} from "./src/workflow.ts";

export * from "./src/workflow.ts";
export * from "./src/saf-workflow-cli/index.ts";
import sampleWorkflows from "./sample/index.ts";
export { sampleWorkflows };
export type * from "./src/types.ts";
export * from "./src/utils.ts";

export function concreteWorkflowToMeta(
  workflow: ConcreteWorkflow,
): WorkflowMeta {
  const stubWorkflow = new workflow();
  if (!stubWorkflow.sourceUrl) {
    throw new Error(
      `Workflow ${stubWorkflow.name} must have a sourceUrl property.`,
    );
  }
  return {
    name: stubWorkflow.name,
    description: stubWorkflow.description,
    cliArguments: stubWorkflow.cliArguments,
    packageName: getPackageName(stubWorkflow.sourceUrl),
    Workflow: workflow,
  };
}

export * from "./src/xstate.ts";
export { copyTemplateStateComposer } from "./src/copy-template-machine/copy-template-machine.ts";
export * from "./src/update-template-machine/update-template-machine.ts";
export * from "./src/test-runner.ts";
export * from "./src/chain.ts";
export * from "./src/npm.ts";
