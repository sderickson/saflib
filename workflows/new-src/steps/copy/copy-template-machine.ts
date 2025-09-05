import { setup, assign } from "xstate";
import {
  workflowActions,
  workflowActors,
  logInfo,
  logError,
  logWarn,
} from "../../../src/xstate.ts";
import { copyNextFile } from "./copy-next-file.ts";
import { renameNextFile } from "./rename-next-file.ts";
import type { WorkflowOutput, WorkflowInput } from "../../../src/xstate.ts";
import { contextFromInput } from "../../../src/workflow.ts";

import type {
  CopyTemplateMachineContext,
  CopyStepInput,
} from "./types.ts";
import { parseChecklist, parseCopiedFiles } from "./helpers.ts";

export type { CopyStepInput };

/**
 * Copies all `templateFiles` to the given directory, renaming all instances of `"template-file"` to the given `name`. Also replaces other variants of the string: camelCase, snake_case, and PascalCase.
 */
export const CopyStepMachine = setup({
  types: {
    input: {} as CopyStepInput & WorkflowInput,
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
    hasMoreFiles: ({ context }) => {
      return context.filesToCopy.length > 0;
    },
  },
}).createMachine({
  id: "copy-template",
  description: "Copy template files and rename placeholders",
  initial: "copy",
  context: (arg) => {
    if (!arg.input.templateFiles) {
      throw new Error("templateFiles is required");
    }
    return {
      ...contextFromInput(arg.input),
      filesToCopy: Object.keys(arg.input.templateFiles || {}),
      name: arg.input.name,
      targetDir: arg.input.targetDir,
      copiedFiles: arg.input.copiedFiles || {},
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
            actions: [
              logWarn(
                ({ event }) =>
                  `File ${event.output.fileName} already exists, skipping`,
              ),
              assign({
                checklist: parseChecklist,
                copiedFiles: parseCopiedFiles,
              }),
            ],
          },
          {
            target: "rename",
            actions: [
              assign({
                checklist: parseChecklist,
                copiedFiles: parseCopiedFiles,
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
        },
      },
    },
    popFile: {
      entry: [
        logInfo(
          ({ event }) => `Generated "${event.output.fileName}" from template`,
        ),
        assign(({ context }) => ({
          filesToCopy: context.filesToCopy.slice(1),
        })),
      ],
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
      copiedFiles: context.copiedFiles,
    };
  },
});
