import type { CLIArgument } from "./bin/types.ts";
import type { ConcreteWorkflow as ConcreteWorkflow } from "./bin/workflow.ts";
import { AddTestsWorkflow } from "./workflows/add-tests.ts";
import { SplitFileWorkflow } from "./workflows/split-file.ts";

const workflowClasses: ConcreteWorkflow[] = [
  AddTestsWorkflow,
  SplitFileWorkflow,
];

interface WorkflowMeta {
  name: string;
  cliArguments: CLIArgument[];
  Workflow: ConcreteWorkflow;
}

export const workflows: WorkflowMeta[] = workflowClasses.map((Workflow) => {
  const stubWorkflow = new Workflow();
  return {
    name: stubWorkflow.workflowName,
    cliArguments: stubWorkflow.cliArguments,
    Workflow,
  };
});
