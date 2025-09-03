import { assign, fromPromise, setup } from "xstate";
import {
  workflowActions,
  workflowActors,
  type WorkflowContext,
  type WorkflowInput,
} from "../../src/xstate.ts";
import path from "node:path";
import { doesTestPass } from "../../src/xstate.ts";
import { logInfo, logError, promptAgent } from "../../src/xstate.ts";
import { raise } from "xstate";

interface TestMachineInput extends WorkflowInput {
  fileId?: string;
}

interface TestMachineContext extends WorkflowContext {
  fileId?: string;
}

export const TestStepMachine = setup({
  types: {
    input: {} as TestMachineInput,
    context: {} as TestMachineContext,
  },
  actions: {
    ...workflowActions,
  },
  actors: {
    ...workflowActors,
  },
}).createMachine({
  id: "test-step",
  context: ({ input, self }) => ({
    checklist: [],
    loggedLast: false,
    systemPrompt: "",
    dryRun: input.dryRun,
    rootRef: input.rootRef || self,
    fileId: input.fileId,
  }),
  initial: "test",
  states: {
    test: {
      invoke: {
        src: fromPromise(async ({ input: fileName }: { input: string }) => {
          return await doesTestPass(fileName);
        }),
        input: ({ context }) =>
          context.fileId
            ? path.basename(context.copiedFiles![context.fileId])
            : "",
        onDone: {
          target: "done",
          actions: [
            logInfo(() => `Tests passed successfully.`),
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
});
