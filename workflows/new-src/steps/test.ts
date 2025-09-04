import { assign, fromPromise, setup } from "xstate";
import {
  workflowActions,
  workflowActors,
  type WorkflowContext,
  type WorkflowInput,
  type WorkflowOutput,
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
      checklist: [],
      loggedLast: false,
      systemPrompt: "",
      dryRun: input.dryRun,
      rootRef: input.rootRef || self,
      fileId: input.fileId,
      copiedFiles: input.copiedFiles || {},
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
        checklist: [
          {
            description: `Run tests in the package, make sure they all pass.`,
          },
        ],
      };
    }
    const fullPath = context.copiedFiles![context.fileId || ""];
    return {
      checklist: [
        {
          description: `Run **${path.basename(fullPath)}**, make sure it passes.`,
        },
      ],
    };
  },
});
