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
import { getWorkflowLogger } from "../../store.ts";

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
   * An arbitrary test. Fails the test if it returns false.
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

export interface UpdateStepContext extends WorkflowContext {
  filePath: string;
  promptMessage: string | ((context: WorkflowContext) => string);
  valid: UpdateStepTest[];
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
    invalid: ({ context }: { context: UpdateStepContext }) => {
      if (context.dryRun || !context.valid.length) {
        return false;
      }
      const resolvedPath = context.filePath;
      const content = readFileSync(resolvedPath, "utf-8");
      const log = getWorkflowLogger();
      let allPassed = true;
      for (const test of context.valid) {
        if (!test.test(content)) {
          log.error(`Test ${test.name} failed: ${test.description}`);
          allPassed = false;
        } else {
          log.info(`Test ${test.name} passed.`);
        }
      }
      if (allPassed) {
        log.info(`Tests passed for ${resolvedPath}`);
        return false;
      }
      return true;
    },
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
    if (!input.copiedFiles) {
      throw new Error(
        "`copiedFiles` not passed in. Did you run CopyStepMachine before UpdateStepMachine?"
      );
    }
    if (!input.copiedFiles[input.fileId]) {
      throw new Error(
        `\`copiedFiles[${input.fileId}]\` not found. Is that a valid key in \`templateFiles\`?`
      );
    }
    const filePath = input.copiedFiles[input.fileId];
    return {
      ...contextFromInput(input, self),
      filePath,
      promptMessage: input.promptMessage,
      valid: input.valid || [],
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
            guard: "invalid",
            actions: [
              logError(({ context }) => {
                const filePathStr = path.basename(context.filePath);
                return `Validation checks did not all succeed for ${filePathStr}. Please fix the issues and continue.`;
              }),
            ],
          },
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
