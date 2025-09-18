import { setup, raise } from "xstate";
import { workflowActions, workflowActors, promptAgent } from "../xstate.ts";
import { type WorkflowContext, type WorkflowInput } from "../types.ts";
import { contextFromInput } from "../utils.ts";

/**
 * Input for the PromptStepMachine.
 */
export interface PromptStepInput {
  /**
   * The text to be shown to the agent or user. The machine will then stop until the workflow is continued.
   */
  promptText: string;
}

/**
 * @internal
 */
export interface PromptStepContext extends WorkflowContext {
  promptText: string;
}

/**
 * Prompts the agent or user to do something. Stops the workflow until the workflow is continued.
 */
export const PromptStepMachine = setup({
  types: {
    input: {} as PromptStepInput & WorkflowInput,
    context: {} as PromptStepContext,
  },
  actions: {
    ...workflowActions,
  },
  actors: {
    ...workflowActors,
  },
  guards: {
    shouldSkipForMode: ({ context }) =>
      context.runMode === "dry" || context.runMode === "script",
  },
}).createMachine({
  id: "prompt-step",
  context: ({ input, self }) => ({
    ...contextFromInput(input, self),
    promptText: input.promptText,
  }),
  initial: "running",
  states: {
    running: {
      entry: raise({ type: "prompt" }),
      on: {
        prompt: [
          {
            guard: "shouldSkipForMode",
            actions: [raise({ type: "continue" })],
          },
          {
            actions: [promptAgent(({ context }) => context.promptText)],
          },
        ],
        continue: {
          target: "done",
        },
      },
    },
    done: {
      type: "final",
    },
  },
  output: ({ context }) => {
    return {
      checklist: {
        description: context.promptText.split("\n")[0],
      },
    };
  },
});
