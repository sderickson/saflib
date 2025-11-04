import { defineWorkflow, makeWorkflowMachine, step } from "@saflib/workflows";
import { InitServiceWorkflowDefinition } from "@saflib/service/workflows";

const input = [] as const;
interface TestAllWorkflowsContext {}

export const TestAllWorkflowsDefinition = defineWorkflow<
  typeof input,
  TestAllWorkflowsContext
>({
  id: "saflib/test-all-workflows",
  description: "Run all @saflib workflows.",
  input,
  context: () => ({}),
  sourceUrl: import.meta.url,
  templateFiles: {},
  docFiles: {},
  steps: [
    step(makeWorkflowMachine(InitServiceWorkflowDefinition), () => ({
      name: "tmp-service",
      path: "./services/tmp",
    })),
  ],
});

export default TestAllWorkflowsDefinition;
