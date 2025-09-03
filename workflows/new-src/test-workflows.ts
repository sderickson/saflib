import { promptStepMachine } from "./steps/prompt.ts";
import type { Workflow, Step } from "./types.ts";
import { makeMachineFromWorkflow } from "./make.ts";
import type { CLIArgument } from "../src/types.ts";
import { type AnyStateMachine } from "xstate";

function defineWorkflow<I extends readonly CLIArgument[], C>(
  workflow: Workflow<I, C>,
): Workflow<I, C> {
  return {
    ...workflow,
    steps: defineSteps<C>(workflow.steps),
  };
}

function defineSteps<C>(
  steps: Step<C, AnyStateMachine>[],
): Step<C, AnyStateMachine>[] {
  return steps;
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
  steps: defineSteps<JustPromptContext>([
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
  ]),
});

export const promptWorkflowMachine = makeMachineFromWorkflow<
  typeof input,
  JustPromptContext
>(justPromptWorkflow);
