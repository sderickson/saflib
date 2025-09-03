import { promptStepMachine } from "./steps/prompt.ts";
import { makeMachineFromWorkflow, defineWorkflow } from "./make.ts";

interface JustPromptContext {
  promptText: string;
}

const input = [
  { name: "prompt", description: "The prompt to be shown" },
  { name: "prompt2", description: "The second prompt to be shown" },
] as const;

export const justPromptWorkflow = defineWorkflow({
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

export const promptWorkflowMachine = makeMachineFromWorkflow<
  typeof input,
  JustPromptContext
>(justPromptWorkflow);
