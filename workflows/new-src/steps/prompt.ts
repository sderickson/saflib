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
 * Input *specifically* for the prompt step machine. Extends WorkflowInput because each workflow needs to accept it so that other workflow machines can invoke them.
 */
interface PromptMachineInput extends WorkflowInput {
  promptText: string;
}

/**
 * Context *specifically* for the prompt step machine. Extends WorkflowContext because each workflow needs to accept it so that other workflow machines can invoke them.
 */
interface PromptMachineContext extends WorkflowContext {
  promptText: string;
}

/**
 * A machine for a step in a workflow, where an LLM is prompted to do something.
 */
export const PromptStepMachine = setup({
  types: {
    input: {} as PromptMachineInput,
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
  context: ({ input, self }) => ({
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
