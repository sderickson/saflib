import { defineWorkflow, step } from "./core/make.ts";
import type { WorkflowDefinition } from "./core/types.ts";
import { PromptStepMachine } from "./core/steps/prompt.ts";

const simpleWorkflow: WorkflowDefinition = defineWorkflow({
  id: "simple-test",
  description: "A simple test workflow that completes immediately",
  sourceUrl: import.meta.url,
  input: [{ name: "message", description: "A test message" }],
  context: ({ input }) => ({
    message: input.message,
  }),
  templateFiles: {},
  docFiles: {},
  steps: [
    step(PromptStepMachine, ({ context }) => ({
      promptText: `A simple test workflow that completes immediately.
      
      The message is: ${context.message}`,
    })),
  ],
});

export default simpleWorkflow;
