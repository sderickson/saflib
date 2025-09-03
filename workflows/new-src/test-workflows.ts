import { promptStepMachine } from "./steps/prompt.ts";
import type { Workflow, Step, CreateArgsType } from "./types.ts";
import { makeMachineFromWorkflow } from "./make.ts";
import type { CLIArgument } from "../src/types.ts";
import { type AnyStateMachine } from "xstate";

function defineWorkflow<I extends readonly CLIArgument[], C = any>(config: {
  input: I;
  context: (arg: { input: CreateArgsType<I> }) => C;
  id: string;
  description: string;
  templateFiles: Record<string, string>;
  docFiles: Record<string, string>;
  steps: Array<Step<C, AnyStateMachine>>;
}): Workflow<I, C> {
  return config;
}

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
