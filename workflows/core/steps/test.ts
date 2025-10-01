import { assign, fromPromise, setup } from "xstate";
import {
  workflowActions,
  workflowActors,
  doesTestPass,
  logInfo,
  logError,
  promptAgent,
} from "../xstate.ts";
import {
  type WorkflowContext,
  type WorkflowInput,
  type WorkflowOutput,
} from "../types.ts";
import path from "node:path";
import { raise } from "xstate";
import { contextFromInput } from "../utils.ts";
import { handlePrompt } from "../xstate-actions/prompt.ts";

/**
 * Input for the TestStepMachine.
 */
export interface TestStepInput {
  /**
   * The id of the file to test. Must match one of the keys in the `templateFiles` property for the workflow. If not included, the workflow will run all tests for the current package.
   */
  fileId?: string;
}

/**
 * @internal
 */
export interface TestStepContext extends WorkflowContext {
  fileId?: string;
}

/**
 * Runs either a single test in the package or all tests in the package. Stops the workflow if the test(s) fail.
 */
export const TestStepMachine = setup({
  types: {
    input: {} as TestStepInput & WorkflowInput,
    context: {} as TestStepContext,
    output: {} as WorkflowOutput,
  },
  actions: {
    ...workflowActions,
  },
  actors: {
    ...workflowActors,
    test: fromPromise(
      async ({ input }: { input: TestStepContext & { fileName: string } }) => {
        if (input.runMode === "dry" || input.runMode === "script") {
          return true;
        }
        let tries = 0;
        while (true) {
          if (tries > 3) {
            throw new Error(`Agent failed to fix test: ${input.fileName}`);
          }

          try {
            await doesTestPass(input.fileName, { cwd: input.cwd });
            return {
              shouldContinue: true,
            };
          } catch (error) {
            const baseMsg = input.fileName
              ? `The test \`${input.fileName}\` failed.`
              : `Tests failed.`;
            const { shouldContinue } = await handlePrompt({
              context: input,
              msg:
                baseMsg +
                `\nCwd: ${input.cwd}\nPlease run with "npm run test" and fix the issues.`,
            });
            if (!shouldContinue) {
              throw error;
            }
            tries++;
          }
        }
      },
    ),
  },
}).createMachine({
  id: "test-step",
  context: ({ input, self }) => {
    return {
      ...contextFromInput(input),
      fileId: input.fileId,
    };
  },
  initial: "test",
  states: {
    test: {
      invoke: {
        src: "test",
        input: ({ context }) => {
          return {
            ...context,
            fileName: context.fileId
              ? path.basename(context.copiedFiles![context.fileId])
              : "",
          };
        },
        onDone: {
          target: "done",
          actions: [
            logInfo(({ context }) =>
              context.fileId
                ? `Tests passed successfully for ${path.basename(
                    context.copiedFiles![context.fileId],
                  )}`
                : `Tests passed successfully.`,
            ),
            assign({
              checklist: ({ context }) => {
                return [
                  ...context.checklist,
                  {
                    description: `Run test, make sure it passes.`,
                  },
                ];
              },
            }),
          ],
        },
        onError: {
          actions: [
            logError(
              ({ event }) => `Tests failed: ${(event.error as Error).message}`,
            ),
            raise({ type: "prompt" }),
          ],
        },
      },
      on: {
        prompt: {
          actions: promptAgent(
            () => "Tests failed. Please fix the issues and continue.",
          ),
        },
        continue: {
          reenter: true,
          target: "test",
        },
      },
    },
    done: {
      type: "final",
    },
  },
  output: ({ context }) => {
    if (!context.fileId) {
      return {
        checklist: {
          description: `Run tests in the package, make sure they all pass.`,
        },
      };
    }
    const fullPath = context.copiedFiles![context.fileId || ""];
    return {
      checklist: {
        description: `Run **${path.basename(fullPath)}**, make sure it passes.`,
      },
    };
  },
});
