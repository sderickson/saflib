import { setup, assign, raise } from "xstate";
import {
  workflowActionImplementations,
  workflowActors,
  logInfo,
  logError,
  logWarn,
  promptAgent,
  type WorkflowContext,
  type FactoryFunctionOptions,
} from "../xstate.ts";
import { kebabCaseToPascalCase } from "../utils.ts";
import { readFileSync } from "node:fs";
import path from "node:path";
import type {
  CopyTemplateMachineContext,
  CopyTemplateMachineInput,
  TemplateWorkflowContext,
} from "./types.ts";
import { fetchFileNames } from "./fetch-file-names.ts";
import { copyNextFile } from "./copy-next-file.ts";
import { renameNextFile } from "./rename-next-file.ts";

export const CopyTemplateMachine = setup({
  types: {
    input: {} as CopyTemplateMachineInput,
    context: {} as CopyTemplateMachineContext,
  },
  actions: workflowActionImplementations,
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
  context: ({ input }) => ({
    name: input.name,
    pascalName: kebabCaseToPascalCase(input.name),
    targetDir: input.targetDir,
    sourceDir: input.sourceDir,
    sourceFiles: [],
    targetFiles: [],
    filesToCopy: [],
    loggedLast: false,
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
        onError: {
          target: "error",
          actions: logError(
            ({ event }) =>
              `Failed to fetch file names: ${(event.error as Error).message}`,
          ),
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
            actions: logInfo(
              ({ event }) =>
                `Copied file to ${(event.output as { skipped: boolean; fileName: string }).fileName}`,
            ),
          },
        ],
        onError: {
          target: "error",
          actions: logError(
            ({ event }) =>
              `Failed to copy file: ${(event.error as Error).message}`,
          ),
        },
      },
    },
    rename: {
      invoke: {
        input: ({ context }) => context,
        src: "renameNextFile",
        onDone: {
          target: "popFile",
          actions: logInfo(
            ({ event }) =>
              `Renamed placeholders in ${(event.output as { fileName: string }).fileName}`,
          ),
        },
        onError: {
          target: "error",
          actions: logError(
            ({ event }) =>
              `Failed to rename placeholders: ${(event.error as Error).message}`,
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
});

export function useTemplateStateFactory({
  stateName,
  nextStateName,
}: {
  stateName: string;
  nextStateName: string;
}) {
  return {
    [stateName]: {
      invoke: {
        input: ({ context }: { context: TemplateWorkflowContext }) => ({
          sourceDir: context.sourceDir,
          targetDir: context.targetDir,
          name: context.name,
        }),
        src: CopyTemplateMachine,
        onDone: {
          target: nextStateName,
          actions: logInfo(
            () => `Template files copied and renamed successfully.`,
          ),
        },
        onError: {
          actions: [
            logError(
              ({ event }: { event: any }) =>
                `Failed to copy and rename template: ${(event.error as Error).message}`,
            ),
            raise({ type: "prompt" }),
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

interface UpdateTemplateFileFactoryOptions<C extends WorkflowContext>
  extends FactoryFunctionOptions {
  filePath: string | ((context: C) => string);
  promptMessage: string | ((context: C) => string);
}

export function updateTemplateFileFactory<C extends TemplateWorkflowContext>({
  filePath,
  promptMessage,
  stateName,
  nextStateName,
}: UpdateTemplateFileFactoryOptions<C>) {
  return {
    [stateName]: {
      entry: raise({ type: "prompt" }),
      on: {
        prompt: {
          actions: [
            promptAgent(
              typeof promptMessage === "string"
                ? () => promptMessage
                : ({ context }: { context: C }) => promptMessage(context),
            ),
          ],
        },
        continue: [
          {
            guard: ({ context }: { context: C }) => {
              const resolvedPath =
                typeof filePath === "string"
                  ? path.resolve(process.cwd(), filePath)
                  : path.resolve(process.cwd(), filePath(context));
              const content = readFileSync(resolvedPath, "utf-8");
              const hasTodos = /\btodo\b/i.test(content);
              return hasTodos;
            },
            target: stateName,
            actions: [
              logError(({ context }: { context: C }) => {
                const filePathStr =
                  typeof filePath === "string" ? filePath : filePath(context);
                return `File ${filePathStr} was not properly updated - it still contains TODO strings. Please complete the implementation. If it's unclear what needs to be done, ask for help.`;
              }),
            ],
          },
          {
            target: nextStateName,
          },
        ],
      },
    },
  };
}
