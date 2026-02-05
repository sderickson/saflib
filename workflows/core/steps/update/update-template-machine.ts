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
 * Input for the UpdateStepMachine.
 */
export interface UpdateStepInput {
  /**
   * The id of the file the user is expected to update. Must match one of the keys in the `templateFiles` property for the workflow.
   */
  fileId: string;

  /**
   * The message to show to the user. The machine will then stop until the workflow is continued.
   * @deprecated Use `prompt` instead.
   */
  promptMessage?: string | ((context: WorkflowContext) => string);

  /**
   * The message to show to the user. The machine will then stop until the workflow is continued.
   */
  prompt?: string;
}

/**
 * @internal
 */
export interface UpdateStepContext extends WorkflowContext {
  filePath: string;
  prompt: string;
  shouldContinue?: boolean;
  hasTodos?: boolean;
}

/**
 * @internal
 */
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
      if (input.runMode === "dry" || input.runMode === "checklist" || input.runMode === "script") {
        return { shouldContinue: true };
      }

      const { sessionId, shouldContinue } = await handlePrompt({
        context: input,
        msg: input.prompt,
      });
      const hadTodos = input.hasTodos;
      const agentConfig = input.agentConfig;

      let tries = 1;
      let hasTodos = false;
      while (true) {
        if (input.skipTodos) {
          break;
        }
        const resolvedPath = input.filePath;
        const content = readFileSync(resolvedPath, "utf-8");
        hasTodos = /\s*(?:#|\/\/).*todo/i.test(content);
        if (!hasTodos) {
          break;
        }
        if (input.runMode === "print" && !hadTodos) {
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
            msg: `File ${resolvedPath} contains TODO strings. Make sure to resolve them before continuing.`,
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
    isRunMode: ({ context }) => {
      return context.runMode === "run";
    },
    shouldContinue: ({ context }) => {
      return !!context.shouldContinue;
    },
    hasTodos: ({ context }) => {
      const resolvedPath = context.filePath;
      const content = readFileSync(resolvedPath, "utf-8");
      return /\s*(?:#|\/\/).*todo/i.test(content);
    },
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
      prompt:
        typeof input.promptMessage === "string"
          ? input.promptMessage
          : (input.prompt ?? "Update `" + filePath + "`."),
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
            guard: "isRunMode",
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
          guard: "shouldContinue",
          target: "done",
        },
        continue: [
          {
            guard: "hasTodos",
            target: "update",
          },
          {
            target: "done",
          },
        ],
        prompt: {
          actions: [
            ({ context }) => {
              console.log(context.prompt);
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
      checklist: {
        description: context.prompt.split("\n")[0],
      },
      filePath: context.filePath,
    };
  },
});
