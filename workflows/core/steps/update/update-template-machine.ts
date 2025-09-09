import { raise, setup } from "xstate";
import type {
  WorkflowContext,
  WorkflowInput,
  WorkflowOutput,
} from "../../types.ts";
import {
  promptAgent,
  workflowActions,
  logError,
  workflowActors,
} from "../../xstate.ts";
import { readFileSync } from "node:fs";
import path from "node:path";
import { contextFromInput } from "../../utils.ts";
import { sendTo } from "xstate";

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
}

export interface UpdateStepContext extends WorkflowContext {
  filePath: string;
  promptMessage: string | ((context: WorkflowContext) => string);
}

/**
 * Prompts the agent to update one of the templateFiles that was copied over by the CopyStepMachine.
 */
export const UpdateStepMachine = setup({
  types: {
    output: {} as WorkflowOutput,
    input: {} as UpdateStepInput & WorkflowInput,
    context: {} as UpdateStepContext,
  },
  actions: {
    ...workflowActions,
  },
  actors: {
    ...workflowActors,
  },
  guards: {
    todosRemain: ({ context }: { context: UpdateStepContext }) => {
      if (context.dryRun) {
        return false;
      }
      const resolvedPath = context.filePath;
      const content = readFileSync(resolvedPath, "utf-8");
      const hasTodos = /\s*(?:#|\/\/).*todo/i.test(content);
      return hasTodos;
    },
    dryRun: ({ context }) => context.dryRun || false,
  },
}).createMachine({
  id: "update-step",
  initial: "update",
  context: ({ input, self }) => {
    const filePath = input.copiedFiles![input.fileId];
    return {
      ...contextFromInput(input, self),
      filePath,
      promptMessage: input.promptMessage,
    };
  },
  states: {
    update: {
      entry: raise({ type: "prompt" }),
      on: {
        prompt: [
          { guard: "dryRun", actions: [raise({ type: "continue" })] },
          {
            actions: [
              promptAgent(({ context }) => {
                return typeof context.promptMessage === "string"
                  ? context.promptMessage
                  : context.promptMessage(context);
              }),
            ],
          },
        ],

        continue: [
          {
            guard: "todosRemain",
            actions: [
              logError(({ context }) => {
                const filePathStr = path.basename(context.filePath);
                return `File ${filePathStr} was not properly updated - it still contains TODO strings. Please complete the implementation. If it's unclear what needs to be done, ask for help.`;
              }),
            ],
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
    };
  },
});
