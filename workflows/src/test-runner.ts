import { assign, fromPromise, raise } from "xstate";
import {
  logInfo,
  logError,
  promptAgent,
  doesTestPass,
  type WorkflowContext,
  type ComposerFunctionOptions,
} from "./xstate.ts";
import type { ChecklistItem } from "./types.ts";

/**
 * Options for the runTestsComposer function.
 */
export interface RunTestsComposerOptions<C extends WorkflowContext>
  extends ComposerFunctionOptions {
  filePath: string | ((context: C) => string);
}

/**
 * Composer for running tests. Takes a specific file path to test.
 */
export function runTestsComposer<C extends WorkflowContext>({
  filePath,
  stateName,
  nextStateName,
}: RunTestsComposerOptions<C>) {
  return {
    [stateName]: {
      invoke: {
        src: fromPromise(async ({ input }: { input: C }) => {
          const resolvedPath =
            typeof filePath === "string" ? filePath : filePath(input);
          if (input.dryRun) {
            return true;
          }
          return await doesTestPass(resolvedPath);
        }),
        input: ({ context }: { context: C }) => context,
        onDone: {
          target: nextStateName,
          actions: [
            logInfo(() => `Tests passed successfully.`),
            assign({
              checklist: ({ context }) => {
                const c = context as C;
                return [
                  ...c.checklist,
                  {
                    description: `Run test, make sure it passes.`,
                  },
                ] satisfies ChecklistItem[];
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
          target: stateName,
        },
      },
    },
  };
}
