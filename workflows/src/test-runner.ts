import { fromPromise, raise } from "xstate";
import {
  logInfo,
  logError,
  promptAgent,
  doesTestPass,
  type WorkflowContext,
} from "./xstate.ts";

interface RunTestsFactoryOptions<C extends WorkflowContext> {
  filePath: string | ((context: C) => string);
  stateName: string;
  nextStateName: string;
}

export function runTestsFactory<C extends WorkflowContext>({
  filePath,
  stateName,
  nextStateName,
}: RunTestsFactoryOptions<C>) {
  return {
    [stateName]: {
      invoke: {
        src: fromPromise(async ({ input }: { input: C }) => {
          const resolvedPath =
            typeof filePath === "string" ? filePath : filePath(input);
          return await doesTestPass(resolvedPath);
        }),
        input: ({ context }: { context: C }) => context,
        onDone: {
          target: nextStateName,
          actions: logInfo(() => `Tests passed successfully.`),
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
