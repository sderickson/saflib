import { fromPromise, setup, raise } from "xstate";
import { existsSync } from "fs";
import { basename } from "path";
import {
  doTestsPass,
  doTestsPassSync,
  logInfo,
  logError,
  prompt,
  workflowActionImplementations,
} from "./xstate-shared.ts";
import type { WorkflowContext } from "./xstate-shared.ts";

interface AddTestsWorkflowContext extends WorkflowContext {
  path: string;
  basename: string;
}

interface AddTestsWorkflowInput {
  path: string;
}

export const AddTestsWorkflow = setup({
  types: {
    input: {} as AddTestsWorkflowInput,
    context: {} as AddTestsWorkflowContext,
  },
  actions: {
    ...workflowActionImplementations,
  },
  actors: {
    noop: fromPromise(async (_) => {}),
  },
}).createMachine({
  id: "add-tests",
  description: "Given a file, add tests to the file.",
  initial: "validatingTests",
  context: ({ input }) => {
    if (!existsSync(input.path)) {
      throw new Error(`File does not exist: ${input.path}`);
    }
    return {
      path: input.path,
      basename: basename(input.path),
      loggedLast: false,
    };
  },
  entry: logInfo("Successfully began workflow"),
  states: {
    validatingTests: {
      on: {
        continue: { reenter: true },
        prompt: {
          actions: prompt(
            ({ context }) =>
              `First, run the existing tests for the package that ${context.basename} is in. You should be able to run "npm run test". Run the tests for that package and make sure they are passing.`,
          ),
        },
      },
      invoke: {
        src: fromPromise(doTestsPass),
        onDone: {
          target: "addingTests",
          actions: logInfo(
            ({ context: c }) => `Tests passed for ${c.basename}.`,
          ),
        },
        onError: {
          actions: [
            logError(({ context: c }) => `Tests failed for ${c.basename}.`),
            raise({ type: "prompt" }),
          ],
        },
      },
    },
    addingTests: {
      entry: raise({ type: "prompt" }),
      on: {
        prompt: {
          actions: prompt(
            ({ context }) =>
              `Add tests to ${context.basename}. Create the test file next to the file you are testing.`,
          ),
        },
        continue: [
          {
            guard: () => !doTestsPassSync(),
            actions: [
              logError(({ context: c }) => `Tests failed for ${c.basename}.`),
              raise({ type: "prompt" }),
            ],
          },
          {
            actions: logInfo(
              ({ context: c }) => `Tests passed for ${c.basename}.`,
            ),
            target: "done",
          },
        ],
      },
    },
    done: {
      type: "final",
    },
  },
});
