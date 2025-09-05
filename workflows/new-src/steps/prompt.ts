import { setup } from "xstate";
import {
  workflowActions,
  workflowActors,
  promptAgent,
  logInfo,
} from "../../src/xstate.ts";
import { sendTo, assign, raise } from "xstate";
import { contextFromInput, outputFromContext } from "../../src/workflow.ts";
import type { WorkflowContext, WorkflowInput } from "../../src/xstate.ts";

/**
 * Input for the PromptStepMachine.
 */
export interface PromptMachineInput {
  /**
   * The text to be shown to the agent or user. The machine will then stop until the workflow is continued.
   */
  promptText: string;
}

interface PromptMachineContext extends WorkflowContext {
  promptText: string;
}

/**
 * Prompts the agent or user to do something. Stops the workflow until the workflow is continued.
 */
export const PromptStepMachine = setup({
  types: {
    input: {} as PromptMachineInput & WorkflowInput,
    context: {} as PromptMachineContext,
  },
  actions: {
    ...workflowActions,
  },
  actors: {
    ...workflowActors,
  },
}).createMachine({
  id: "prompt-step",
  context: ({ input }) => ({
    ...contextFromInput(input),
    promptText: input.promptText,
  }),
  initial: "running",
  states: {
    running: {
      entry: raise({ type: "prompt" }),
      on: {
        prompt: {
          actions: [
            promptAgent(({ context }) => context.promptText),
            sendTo(({ context }) => context.rootRef, { type: "halt" }),

            assign({
              checklist: ({ context }) => {
                return [
                  ...context.checklist,
                  {
                    description: context.promptText.split("\n")[0],
                  },
                ];
              },
            }),
            // raise({ type: "continue" }),
          ],
        },
        continue: {
          actions: [logInfo("Continuing...")],
          target: "done",
        },
      },
    },
    done: {
      type: "final",
    },
  },
  output: ({ context }) => outputFromContext({ context }),
});
