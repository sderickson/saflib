import { setup, raise, fromPromise, assign } from "xstate";
import { workflowActions, workflowActors } from "../xstate.ts";
import { type WorkflowContext, type WorkflowInput } from "../types.ts";
import { contextFromInput } from "../utils.ts";
import { executePrompt, printPrompt } from "../xstate-actions/prompt.ts";

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
}

export interface PromptStepOutput {
  shouldContinue: boolean;
  sessionId?: string;
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

        console.log("executing prompt with agent config", input.agentConfig);
        // printPrompt({ context: input, msg: input.promptText });
        const { sessionId } = await executePrompt({
          context: input,
          msg: input.promptText,
        });
        console.log("Got session id from executePrompt", sessionId);
        return { shouldContinue: true, sessionId };
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
  context: ({ input, self }) => ({
    ...contextFromInput(input, self),
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
            guard: ({ event }) => {
              return event.output.shouldContinue;
            },
            actions: [
              assign({
                agentConfig: ({ event, context }) => {
                  console.log(
                    "Assigning session id to agent config",
                    event.output.sessionId,
                  );
                  return {
                    ...context.agentConfig,
                    cli: "cursor-agent",
                    sessionId: event.output.sessionId,
                  };
                },
              }),
            ],
            target: "done",
          },

          {
            actions: [
              assign({
                agentConfig: ({ event, context }) => {
                  console.log(
                    "Assigning session id to agent config",
                    event.output.sessionId,
                  );
                  return {
                    ...context.agentConfig,
                    cli: "cursor-agent",
                    sessionId: event.output.sessionId,
                  };
                },
              }),
            ],
          },
        ],
      },
      on: {
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
