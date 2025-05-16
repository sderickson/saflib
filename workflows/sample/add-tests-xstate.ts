import { fromPromise, setup, raise } from "xstate";
import { existsSync } from "fs";
import { basename } from "path";
import {
  doTestsPass,
  doTestsPassSync,
  logInfo,
  logError,
  promptAgent,
  workflowActionImplementations,
  workflowActors,
} from "../src/xstate.ts";
import type { WorkflowContext } from "../src/xstate.ts";
import { XStateWorkflow } from "../src/workflow.ts";

interface AddTestsWorkflowContext extends WorkflowContext {
  path: string;
  basename: string;
}

interface AddTestsWorkflowInput {
  path: string;
}

export const AddTestsWorkflowMachine = setup({
  types: {
    input: {} as AddTestsWorkflowInput,
    context: {} as AddTestsWorkflowContext,
  },
  actions: workflowActionImplementations,
  actors: workflowActors,
}).createMachine({
  id: "add-tests-xstate",
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
      systemPrompt: `You are adding tests to ${input.path}.`,
    };
  },
  entry: logInfo("Successfully began workflow"),
  states: {
    validatingTests: {
      on: {
        continue: {
          reenter: true,
          target: "validatingTests",
        },
        prompt: {
          actions: promptAgent(
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
          actions: promptAgent(
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

export class AddTestsWorkflowXState extends XStateWorkflow {
  machine = AddTestsWorkflowMachine;
  description = "Given a file, add tests to the file.";
  cliArguments = [
    {
      name: "path",
      description: "The path to the file to add tests to",
    },
  ];
}
