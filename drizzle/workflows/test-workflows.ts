import {
  DrizzleInitWorkflowDefinition,
  UpdateSchemaWorkflowDefinition,
  AddDrizzleQueryWorkflowDefinition,
} from "./index.ts";

import {
  defineWorkflow,
  step,
  makeWorkflowMachine,
  PromptStepMachine,
  CommandStepMachine,
  CdStepMachine,
} from "@saflib/workflows";

const input = [] as const;

interface TestDrizzleWorkflowsContext {}

/**
 * Manual check for drizzle/init offshoot + incremental add-* inside the offshoot.
 * Expects cwd to be a product root already created by product/init.
 */
const TestDrizzleWorkflowsDefinition = defineWorkflow<
  typeof input,
  TestDrizzleWorkflowsContext
>({
  id: "drizzle/test-workflows",
  description: "Run drizzle offshoot init + schema/query workflows",
  input,
  context: () => ({}),
  sourceUrl: import.meta.url,
  templateFiles: {},
  docFiles: {},
  steps: [
    step(PromptStepMachine, () => ({
      promptText: `Go over the test goals.

      This exercises drizzle/init against an existing product (from product/init):

      - drizzle/init for offshoot "demo" (db package + weave into service/db)
      - drizzle/update-schema + drizzle/add-query inside the offshoot db
      - Clean up`,
    })),
    step(makeWorkflowMachine(DrizzleInitWorkflowDefinition), () => ({
      name: "demo",
    })),
    step(CdStepMachine, () => ({
      path: "./demo/db",
    })),
    step(makeWorkflowMachine(UpdateSchemaWorkflowDefinition), () => ({
      path: "./schemas/users.ts",
    })),
    step(makeWorkflowMachine(AddDrizzleQueryWorkflowDefinition), () => ({
      path: "./queries/users/create.ts",
    })),
    step(makeWorkflowMachine(AddDrizzleQueryWorkflowDefinition), () => ({
      path: "./queries/users/get-by-id.ts",
    })),
    step(CommandStepMachine, () => ({
      command: "npm",
      args: ["test"],
    })),
    step(PromptStepMachine, () => ({
      promptText: `Check that demo/db exists, is woven into service/db/schema.ts, and queries work.`,
    })),
  ],
});

export default TestDrizzleWorkflowsDefinition;
