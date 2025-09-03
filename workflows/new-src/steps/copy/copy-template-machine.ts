import { setup, assign } from "xstate";
import {
  workflowActions,
  workflowActors,
  logInfo,
  logError,
  logWarn,
} from "../../../src/xstate.ts";
import { getGitHubUrl } from "@saflib/dev-tools";
import { copyNextFile } from "./copy-next-file.ts";
import { renameNextFile } from "./rename-next-file.ts";
import type { WorkflowOutput } from "../../../src/xstate.ts";
import { buildWorkflowContext } from "../../../src/workflow.ts";

import type {
  CopyTemplateMachineContext,
  CopyTemplateMachineInput,
} from "./types.ts";

export const CopyTemplateMachine = setup({
  types: {
    input: {} as CopyTemplateMachineInput,
    context: {} as CopyTemplateMachineContext,
    output: {} as WorkflowOutput,
  },
  actions: {
    ...workflowActions,
  },
  actors: {
    copyNextFile,
    renameNextFile,
    ...workflowActors,
  },
  guards: {
    hasMoreFiles: ({ context }) => context.filesToCopy.length > 0,
  },
}).createMachine({
  id: "copy-template",
  description: "Copy template files and rename placeholders",
  initial: "copy",
  context: (arg) => {
    return {
      ...buildWorkflowContext(arg),
      filesToCopy: Object.keys(arg.input.templateFiles || {}),
      name: arg.input.name,
      targetDir: arg.input.targetDir,
      templateFiles: arg.input.templateFiles,
    };
  },
  entry: logInfo("Starting template copy workflow"),
  states: {
    copy: {
      invoke: {
        input: ({ context }) => {
          return context;
        },
        src: "copyNextFile",
        onDone: [
          {
            guard: ({ event }) => event.output.skipped,
            target: "popFile",
            actions: logWarn(
              ({ event }) =>
                `File ${event.output.fileName} already exists, skipping`,
            ),
          },
          {
            target: "rename",
            actions: [
              logInfo(({ event }) => `Copied file to ${event.output.fileName}`),
              assign({
                checklist: ({ context, event }) => {
                  const fileId = context.filesToCopy[0];
                  const fullPath = context.templateFiles![fileId];
                  const githubPath = getGitHubUrl(fullPath);
                  return [
                    ...context.checklist,
                    {
                      description: `Upsert **${event.output.fileName}** from [template](${githubPath})`,
                    },
                  ];
                },
              }),
            ],
          },
        ],
      },
    },
    rename: {
      invoke: {
        input: ({ context }) => context,
        src: "renameNextFile",
        onDone: {
          target: "popFile",
          actions: logInfo(
            ({ event }) => `Renamed placeholders in ${event.output.fileName}`,
          ),
        },
      },
    },
    popFile: {
      entry: assign(({ context }) => ({
        filesToCopy: context.filesToCopy.slice(1),
      })),
      always: [
        {
          guard: "hasMoreFiles",
          target: "copy",
        },
        {
          target: "done",
        },
      ],
    },
    done: {
      actions: [
        logInfo("Template files copied and renamed successfully."),
        assign({
          checklist: ({ context }) => context.checklist,
        }),
      ],
      type: "final",
      entry: logInfo("Template copy workflow completed successfully"),
    },
    error: {
      type: "final",
      entry: logError("Template copy workflow failed"),
    },
  },
  output: ({ context }) => {
    return {
      checklist: [
        {
          description: `Copy template files and rename placeholders.`,
          subitems: context.checklist,
        },
      ],
    };
  },
});
