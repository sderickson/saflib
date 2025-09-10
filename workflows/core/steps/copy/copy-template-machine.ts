import { setup, assign } from "xstate";
import {
  workflowActions,
  workflowActors,
  logInfo,
  logError,
  logWarn,
} from "../../xstate.ts";
import { copyNextFile } from "./copy-next-file.ts";
import { renameNextFile } from "./rename-next-file.ts";
import type { WorkflowOutput, WorkflowInput } from "../../types.ts";
import { contextFromInput } from "../../utils.ts";

import type { CopyStepContext, CopyStepInput } from "./types.ts";
import { parseChecklist, parseCopiedFiles } from "./helpers.ts";

export type { CopyStepInput };

/**
 * Copies all `templateFiles` to the given directory, renaming all instances of `"template-file"` to the given `name`. Also replaces other variants of the string: camelCase, snake_case, and PascalCase.
 */
export const CopyStepMachine = setup({
  types: {
    input: {} as CopyStepInput & WorkflowInput,
    context: {} as CopyStepContext,
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
    skipped: ({ event }) => event.output.skipped,
  },
}).createMachine({
  id: "copy-template",
  description: "Copy template files and rename placeholders",
  initial: "copy",
  context: ({ input, self }) => {
    if (!input.templateFiles) {
      throw new Error("templateFiles is required");
    }
    return {
      ...contextFromInput(input, self),
      filesToCopy: Object.keys(input.templateFiles || {}),
      name: input.name,
      targetDir: input.targetDir,
      copiedFiles: input.copiedFiles || {},
      lineReplace: input.lineReplace,
    };
  },
  states: {
    copy: {
      invoke: {
        input: ({ context }) => {
          return context;
        },
        src: "copyNextFile",
        onDone: [
          {
            guard: "skipped",
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
      entry: [
        logInfo(
          ({ event }) => `Generated "${event.output.fileName}" from template`,
        ),
      ],
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
      actions: [logInfo("Template files copied and renamed successfully.")],
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
      checklist: {
        description: `Copy template files and rename placeholders.`,
        subitems: context.checklist,
      },
      copiedFiles: context.copiedFiles,
    };
  },
});
