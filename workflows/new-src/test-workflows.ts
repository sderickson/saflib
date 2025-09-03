import { promptStepMachine } from "./steps/prompt.ts";
import type { Workflow, CreateArgsType } from "./types.ts";
import { makeMachineFromWorkflow } from "./make.ts";

interface JustPromptContext {
  promptText: string;
}

const input = [
  { name: "prompt", description: "The prompt to be shown" },
  { name: "prompt2", description: "The second prompt to be shown" },
] as const;

export const justPromptWorkflow: Workflow<JustPromptContext> = {
  input,
  context: () => {
    return { promptText: "What is your name?", checklist: [] };
  },
  id: "prompt-example",
  description: "Just a prompt example",
  templateFiles: {},
  docFiles: {},
  steps: [
    {
      machine: promptStepMachine,
      input: { promptText: "What is your name?" },
    },
    {
      machine: promptStepMachine,
      input: { promptText: "What is your favorite color?" },
    },
  ],
};

type JustPromptInput = CreateArgsType<typeof input>;

export const promptWorkflowMachine = makeMachineFromWorkflow<
  JustPromptInput,
  JustPromptContext
>(justPromptWorkflow);
