import { setup, raise, fromPromise, assign } from "xstate";
import { workflowActions, workflowActors } from "../xstate.ts";
import {
  type WorkflowContext,
  type WorkflowInput,
  type AgentConfig,
} from "../types.ts";
import { contextFromInput } from "../utils.ts";
import { handlePrompt } from "../prompt.ts";

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
  shouldContinue?: boolean;
}

/**
 * @internal
 */
export interface PromptStepOutput {
  shouldContinue: boolean;
  newConfig?: AgentConfig;
}

/**
 * Prompts the agent or user to do an arbitrary task.
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

    prompt: fromPromise(
      async ({
        input,
      }: {
        input: PromptStepContext;
      }): Promise<PromptStepOutput> => {
        if (input.runMode === "dry" || input.runMode === "script") {
          return { shouldContinue: true };
        }
        if (process.env.NODE_ENV === "test") {
          return { shouldContinue: true };
        }
        const { sessionId, shouldContinue } = await handlePrompt({
          context: input,
          msg: input.promptText,
        });
        const agentConfig = input.agentConfig;
        return {
          shouldContinue,
          newConfig: agentConfig ? { ...agentConfig, sessionId } : undefined,
        };
      },
    ),
  },
  guards: {
    shouldSkip: ({ context }) => {
      if (context.runMode === "dry" || context.runMode === "script") {
        return true;
      }
      return false;
    },
    isRunMode: ({ context }) => {
      return context.runMode === "run";
    },
    shouldContinue: ({ context }) => {
      return !!context.shouldContinue;
    },
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
      invoke: {
        src: "prompt",
        input: ({ context }) => context,
        onDone: [
          {
            actions: [
              assign({
                agentConfig: ({ event, context }) => {
                  return event.output.newConfig || context.agentConfig;
                },
                shouldContinue: ({ event }) => {
                  return event.output.shouldContinue;
                },
              }),
            ],
            target: "standby",
          },
        ],
      },

      on: {
        continue: [
          {
            guard: "isRunMode",
            target: "running",
          },
          {
            target: "done",
          },
        ],
      },
    },
    standby: {
      entry: raise({ type: "maybeContinue" }),
      on: {
        maybeContinue: {
          guard: "shouldContinue",
          target: "done",
        },
        continue: {
          target: "done",
        },
        prompt: {
          actions: [
            ({ context }) => {
              console.log(context.promptText);
            },
          ],
        },
      },
    },
    done: {
      type: "final",
    },
  },
  output: ({ context }) => {
    return {
      agentConfig: {
        ...context.agentConfig,
      },
      checklist: {
        description: context.promptText.split("\n")[0],
      },
    };
  },
});
