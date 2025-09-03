import { setup, assign } from "xstate";
import {
  workflowActions,
  workflowActors,
  logInfo,
  logError,
  logWarn,
  promptAgent,
  type ComposerFunctionOptions,
} from "../xstate.ts";
import { kebabCaseToPascalCase } from "@saflib/utils";
import { getGitHubUrl } from "@saflib/dev-tools";
import type {
  CopyTemplateMachineContext,
  CopyTemplateMachineInput,
} from "./types.ts";
import type {
  ChecklistItem,
  TemplateWorkflowContext,
  XStateMachineStates,
} from "../types.ts";
import { fetchFileNames } from "./fetch-file-names.ts";
import { copyNextFile } from "./copy-next-file.ts";
import { renameNextFile } from "./rename-next-file.ts";
import path from "node:path";
export const CopyTemplateMachine = setup({
  types: {
    input: {} as CopyTemplateMachineInput,
    context: {} as CopyTemplateMachineContext,
    output: {} as {
      checklist: ChecklistItem[];
    },
  },
  actions: {
    ...workflowActions,
  },
  actors: {
    fetchFileNames,
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
  initial: "fetchFileNames",
  context: ({ input, self }) => ({
    name: input.name,
    pascalName: kebabCaseToPascalCase(input.name),
    targetDir: input.targetDir,
    sourceDir: input.sourceDir,
    sourceFiles: [],
    targetFiles: [],
    filesToCopy: [],
    loggedLast: false,
    checklist: [],
    dryRun: input.dryRun,
    rootRef: self,
  }),
  entry: logInfo("Starting template copy workflow"),
  states: {
    fetchFileNames: {
      invoke: {
        input: ({ context }) => context,
        src: "fetchFileNames",
        onDone: {
          target: "copy",
          actions: [
            assign(({ event }) => ({
              sourceFiles: event.output.sourceFiles,
              targetFiles: event.output.targetFiles,
              filesToCopy: event.output.sourceFiles,
            })),
            logInfo(
              ({ context }) =>
                `Found ${context.sourceFiles.length} files in source folder`,
            ),
          ],
        },
      },
    },
    copy: {
      invoke: {
        input: ({ context }) => context,
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
                  const filesToCopy = context.filesToCopy;
                  const fullPath = path.join(context.sourceDir, filesToCopy[0]);
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
      checklist: context.checklist,
    };
  },
});

/**
 * Composer for copying template files to a target directory. Also replaces every
 * instance "template-file", "template_file", "TemplateFile", and "templateFile"
 * with the name of the thing being created, passed in via the CLI or other interface.
 * To use this composer, the machine context must extend TemplateWorkflowContext.
 */
export function copyTemplateStateComposer(
  options: ComposerFunctionOptions,
): XStateMachineStates {
  const { stateName, nextStateName } = options;
  return {
    [stateName]: {
      invoke: {
        input: ({ context }: { context: TemplateWorkflowContext }) => ({
          sourceDir: context.sourceDir,
          targetDir: context.targetDir,
          name: context.name,
          dryRun: context.dryRun,
        }),
        src: CopyTemplateMachine,
        onDone: {
          target: nextStateName,
          actions: [
            logInfo(() => `Template files copied and renamed successfully.`),
            assign({
              checklist: ({ context, event }) => {
                const result = [
                  ...context.checklist,
                  {
                    description: `Copy template files and rename placeholders.`,
                    subitems: event.output.checklist,
                  },
                ];
                return result;
              },
            }),
          ],
        },
      },
      on: {
        prompt: {
          actions: promptAgent(
            () =>
              "Failed to copy and rename the template files. Please check if the source directory exists and you have the necessary permissions.",
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
