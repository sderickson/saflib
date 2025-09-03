import { promptStepMachine } from "./steps/prompt.ts";
import { defineWorkflow } from "./make.ts";

const input = [
  { name: "prompt", description: "The prompt to be shown" },
  { name: "prompt2", description: "The second prompt to be shown" },
] as const;

export const promptWorkflowMachine = defineWorkflow({
  input,
  context: ({ input }) => {
    return { promptText: input.prompt };
  },
  id: "prompt-example",
  description: "Just a prompt example",
  templateFiles: {},
  docFiles: {},
  steps: [
    {
      machine: promptStepMachine,
      input: ({ context }) => {
        return { promptText: context.promptText };
      },
    },
    {
      machine: promptStepMachine,
      input: ({ context }) => {
        return { promptText: context.promptText };
      },
    },
  ],
});
