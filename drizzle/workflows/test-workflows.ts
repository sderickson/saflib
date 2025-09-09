import {
  InitWorkflowDefinition,
  UpdateSchemaWorkflowDefinition,
  AddQueryWorkflowDefinition,
} from "./index.ts";

import {
  defineWorkflow,
  step,
  makeWorkflowMachine,
  PromptStepMachine,
  CommandStepMachine,
  CwdStepMachine,
} from "@saflib/workflows";

const input = [] as const;

interface TestDrizzleWorkflowsContext {}

const TestDrizzleWorkflowsDefinition = defineWorkflow<
  typeof input,
  TestDrizzleWorkflowsContext
>({
  id: "drizzle/test-workflows",
  description: "Run all @saflib/drizzle workflows",
  input,
  context: () => ({}),
  sourceUrl: import.meta.url,
  templateFiles: {},
  docFiles: {},
  steps: [
    step(PromptStepMachine, () => ({
      promptText: `Go over the test goals.

      This is a test of the @saflib/drizzle workflows.

      The test goals are:
      - Initialize a new database package
      - Update the schema with a new table
      - Add a query to interact with the new table
      - Test the database functionality
      - Clean up`,
    })),
    step(makeWorkflowMachine(InitWorkflowDefinition), () => ({
      name: "test-database",
    })),
    step(CwdStepMachine, () => ({
      path: "test-database",
    })),
    step(makeWorkflowMachine(UpdateSchemaWorkflowDefinition), () => ({})),
    step(makeWorkflowMachine(AddQueryWorkflowDefinition), () => ({
      path: "queries/users/get-by-id",
    })),
    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["test"],
    })),
    step(PromptStepMachine, () => ({
      promptText: `Check that everything looks good. Consider any difficulties you had while running the above workflows and changes you might make to the definitions.`,
    })),
  ],
});

export default TestDrizzleWorkflowsDefinition;
