import { assign, fromPromise, raise, setup } from "xstate";
import type {
  WorkflowContext,
  WorkflowInput,
  WorkflowOutput,
} from "../../types.ts";
import { workflowActions, workflowActors } from "../../xstate.ts";
import { readFileSync } from "node:fs";
import { contextFromInput } from "../../utils.ts";
import { handlePrompt } from "../../prompt.ts";

/**
 * A simple test format on changes made, for checks beyond just "todo" string existence.
 */
export interface UpdateStepTest {
  /**
   * What to print if the test fails.
   */
  description: string;

  /**
   * The name of the test.
   */
  name: string;

  /**
   * An arbitrary test, given the contents of the file that was updated. Fails the test if it returns false.
   */
  test: (content: string) => boolean;
}

/**
 * Input for the UpdateStepMachine.
 */
export interface UpdateStepInput {
  /**
   * The id of the file the user is expected to update. Must match one of the keys in the `templateFiles` property for the workflow.
   */
  fileId: string;

  /**
   * The message to show to the user. The machine will then stop until the workflow is continued.
   */
  promptMessage: string | ((context: WorkflowContext) => string);

  /**
   * A list of tests to run on the resulting file.
   */
  valid?: UpdateStepTest[];
}

/**
 * @internal
 */
export interface UpdateStepContext extends WorkflowContext {
  filePath: string;
  promptMessage: string | ((context: WorkflowContext) => string);
  valid: UpdateStepTest[];
  shouldContinue?: boolean;
  hasTodos?: boolean;
}

export interface UpdateStepOutput extends WorkflowOutput {
  filePath: string;
}

/**
 * Prompts the agent to update one of the templateFiles that was copied over by the CopyStepMachine.
 */
export const UpdateStepMachine = setup({
  types: {
    output: {} as UpdateStepOutput,
    input: {} as UpdateStepInput & WorkflowInput,
    context: {} as UpdateStepContext,
  },
  actions: {
    ...workflowActions,
  },
  actors: {
    ...workflowActors,

    prompt: fromPromise(async ({ input }: { input: UpdateStepContext }) => {
      if (input.runMode === "dry" || input.runMode === "script") {
        return { shouldContinue: true };
      }

      const { sessionId, shouldContinue } = await handlePrompt({
        context: input,
        msg:
          typeof input.promptMessage === "string"
            ? input.promptMessage
            : input.promptMessage(input),
      });
      const agentConfig = input.agentConfig;

      let tries = 1;
      let hasTodos = false;
      while (true) {
        const resolvedPath = input.filePath;
        const content = readFileSync(resolvedPath, "utf-8");
        hasTodos = /\s*(?:#|\/\/).*todo/i.test(content);
        if (!hasTodos) {
          break;
        }
        if (hasTodos) {
          if (tries > 3) {
            throw new Error(
              `Agent failed to remove TODOs from ${resolvedPath}.`,
            );
          }
          await handlePrompt({
            context: input,
            msg: `File ${resolvedPath} was not properly updated - it still contains TODO strings. Please complete the implementation. If it's unclear what needs to be done, ask for help.`,
          });
          if (!shouldContinue) {
            break;
          }
          tries++;
        }
      }

      return {
        shouldContinue,
        newConfig: agentConfig ? { ...agentConfig, sessionId } : undefined,
        hasTodos,
      };
    }),
  },
  guards: {
    // invalid: ({ context }: { context: UpdateStepContext }) => {
    //   if (!context.valid.length) {
    //     return false;
    //   }
    //   const resolvedPath = context.filePath;
    //   const content = readFileSync(resolvedPath, "utf-8");
    //   const log = getWorkflowLogger();
    //   let allPassed = true;
    //   for (const test of context.valid) {
    //     if (!test.test(content)) {
    //       log.error(`Test ${test.name} failed: ${test.description}`);
    //       allPassed = false;
    //     } else {
    //       log.info(`Test ${test.name} passed.`);
    //     }
    //   }
    //   if (allPassed) {
    //     log.info(`Tests passed for ${resolvedPath}`);
    //     return false;
    //   }
    //   return true;
    // },
  },
}).createMachine({
  id: "update-step",
  initial: "update",
  context: ({ input }) => {
    if (!input.copiedFiles) {
      throw new Error(
        "`copiedFiles` not passed in. Did you run CopyStepMachine before UpdateStepMachine?",
      );
    }
    if (!input.copiedFiles[input.fileId]) {
      throw new Error(
        `\`copiedFiles[${input.fileId}]\` not found. Is that a valid key in \`templateFiles\`?`,
      );
    }
    const filePath = input.copiedFiles[input.fileId];
    return {
      ...contextFromInput(input),
      filePath,
      promptMessage: input.promptMessage,
      valid: input.valid || [],
    };
  },
  states: {
    update: {
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
                hasTodos: ({ event }) => {
                  return event.output.hasTodos;
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
            guard: ({ context }) => {
              return context.runMode === "run";
            },
            target: "update",
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
        continue: [
          {
            guard: ({ context }) => {
              return !!context.hasTodos;
            },
            target: "update",
          },
          {
            target: "done",
          },
        ],
      },
    },
    done: {
      type: "final",
    },
  },
  output: ({ context }) => {
    const promptMessage =
      typeof context.promptMessage === "string"
        ? context.promptMessage
        : context.promptMessage(context);
    return {
      checklist: {
        description: promptMessage.split("\n")[0],
      },
      filePath: context.filePath,
    };
  },
});
