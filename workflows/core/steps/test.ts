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

/**
 * Input for the TestStepMachine.
 */
export interface TestStepInput {
  /**
   * The id of the file to test. Must match one of the keys in the `templateFiles` property for the workflow. If not included, the workflow will run all tests for the current package.
   */
  fileId?: string;
}

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
  },
}).createMachine({
  id: "test-step",
  context: ({ input, self }) => {
    return {
      ...contextFromInput(input, self),
      fileId: input.fileId,
    };
  },
  initial: "test",
  states: {
    test: {
      invoke: {
        src: fromPromise(
          async ({
            input: { fileName, dryRun },
          }: {
            input: { fileName: string; dryRun: boolean };
          }) => {
            if (dryRun) {
              return true;
            }
            return await doesTestPass(fileName);
          },
        ),
        input: ({ context }) => {
          return {
            fileName: context.fileId
              ? path.basename(context.copiedFiles![context.fileId])
              : "",
            dryRun: context.dryRun,
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
