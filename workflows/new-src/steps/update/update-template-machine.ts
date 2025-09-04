import { assign, raise, setup } from "xstate";
import type {
  WorkflowContext,
  WorkflowInput,
  WorkflowOutput,
} from "../../../src/xstate.ts";
import {
  promptAgent,
  workflowActions,
  logError,
  workflowActors,
} from "../../../src/xstate.ts";
import { readFileSync } from "node:fs";
import path from "node:path";

interface UpdateMachineInput extends WorkflowInput {
  fileId: string;
  promptMessage: string | ((context: WorkflowContext) => string);
}

interface UpdateMachineContext extends WorkflowContext {
  filePath: string;
  promptMessage: string | ((context: WorkflowContext) => string);
}

export const UpdateStepMachine = setup({
  types: {
    output: {} as WorkflowOutput,
    input: {} as UpdateMachineInput,
    context: {} as UpdateMachineContext,
  },
  actions: {
    ...workflowActions,
  },
  actors: {
    ...workflowActors,
  },
}).createMachine({
  id: "update-step",
  initial: "update",
  context: ({ input, self }) => {
    const filePath = input.copiedFiles![input.fileId];
    return {
      checklist: [],
      loggedLast: false,
      systemPrompt: "",
      dryRun: input.dryRun,
      filePath,
      promptMessage: input.promptMessage,
      rootRef: input.rootRef || self,
    };
  },
  states: {
    update: {
      entry: raise({ type: "prompt" }),
      on: {
        prompt: {
          actions: [
            promptAgent(({ context }) => {
              return typeof context.promptMessage === "string"
                ? context.promptMessage
                : context.promptMessage(context);
            }),
          ],
        },
        continue: [
          {
            guard: ({ context }) => {
              if (context.dryRun) {
                return false;
              }
              const resolvedPath = context.filePath;
              const content = readFileSync(resolvedPath, "utf-8");
              const hasTodos = /\s*(?:#|\/\/).*todo/i.test(content);
              return hasTodos;
            },
            actions: [
              logError(({ context }) => {
                const filePathStr = path.basename(context.filePath);
                return `File ${filePathStr} was not properly updated - it still contains TODO strings. Please complete the implementation. If it's unclear what needs to be done, ask for help.`;
              }),
            ],
          },
          {
            target: "done",
            actions: [
              assign({
                checklist: ({ context }) => {
                  // const filePathStr = path.basename(context.filePath);
                  const promptMessage =
                    typeof context.promptMessage === "string"
                      ? context.promptMessage
                      : context.promptMessage(context);
                  return [
                    ...context.checklist,
                    {
                      // description: `Update ${filePathStr} to remove TODOs`,
                      description: promptMessage.split("\n")[0],
                    },
                  ];
                },
              }),
            ],
          },
        ],
      },
    },
    done: {
      type: "final",
    },
  },
  output: ({ context }) => {
    return {
      checklist: context.checklist,
    };
  },
});
