import { fromPromise, setup } from "xstate";
import {
  workflowActions,
  workflowActors,
  promptAgent,
} from "../../src/xstate.ts";
import { sendTo, assign, raise } from "xstate";
import { outputFromContext } from "../../src/workflow.ts";
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
export const promptStepMachine = setup({
  types: {
    input: {} as PromptMachineInput,
    context: {} as PromptMachineContext,
  },
  actions: {
    ...workflowActions,
  },
  actors: {
    ...workflowActors,
    // sleep: fromPromise(async (_: any) => {
    //   console.log("sleeping...");
    //   await new Promise((resolve) => setTimeout(resolve, 100));
    //   console.log("done sleeping");
    //   return true;
    // }),
  },
}).createMachine({
  id: "prompt-step",
  context: ({ input, self }) => ({
    checklist: [],
    loggedLast: false,
    systemPrompt: "",
    dryRun: input.dryRun,
    promptText: input.promptText,
    rootRef: input.rootRef || self,
  }),
  initial: "running",
  // initial: "sleep",
  states: {
    // sleep: {
    //   invoke: {
    //     src: "sleep",
    //     onDone: {
    //       target: "running",
    //     },
    //   },
    // },
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
