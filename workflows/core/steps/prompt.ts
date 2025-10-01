import { setup, raise, fromPromise, assign } from "xstate";
import { workflowActions, workflowActors } from "../xstate.ts";
import {
  type WorkflowContext,
  type WorkflowInput,
  type AgentConfig,
} from "../types.ts";
import { contextFromInput } from "../utils.ts";
import { handlePrompt } from "../xstate-actions/prompt.ts";

/**
 * Input for the PromptStepMachine.
 */
export interface PromptStepInput {
  /**
   * The text to be shown to the agent or user. The machine will then stop until the workflow is continued.
   */
  promptText: string;

  /**
   * A function that determines if the prompt should be skipped. Given the context and cwd.
   */
  skipIf?: boolean;
}

/**
 * @internal
 */
export interface PromptStepContext extends WorkflowContext {
  promptText: string;
  skipIf?: boolean;
  shouldContinue?: boolean;
}

export interface PromptStepOutput {
  shouldContinue: boolean;
  newConfig?: AgentConfig;
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

    prompt: fromPromise(
      async ({
        input,
      }: {
        input: PromptStepContext;
      }): Promise<PromptStepOutput> => {
        if (input.runMode === "dry" || input.runMode === "script") {
          return { shouldContinue: true };
        }
        if (input.skipIf === true) {
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
      if (context.skipIf !== undefined) {
        return !!context.skipIf;
      }
      return false;
    },
  },
}).createMachine({
  id: "prompt-step",
  context: ({ input }) => ({
    ...contextFromInput(input),
    promptText: input.promptText,
    skipIf: input.skipIf,
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
            target: "running",
            guard: ({ context }) => {
              return context.runMode === "run";
            },
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
          guard: ({ context }) => {
            return !!context.shouldContinue;
          },
          target: "done",
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
