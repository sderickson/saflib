import { fromPromise, setup } from "xstate";
import type {
  WorkflowContext,
  WorkflowInput,
  WorkflowOutput,
} from "../types.ts";
import { contextFromInput } from "../utils.ts";
import { workflowActions, workflowActors, logInfo } from "../xstate.ts";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

/**
 * Input for the TransformFileStepMachine.
 */
export interface TransformFileStepInput {
  /**
   * Path to the file to transform. Resolved relative to the workflow's cwd.
   */
  filePath: string;

  /**
   * A function that receives the raw file content and returns the updated content.
   */
  transform: (content: string) => string;

  /**
   * Description for the checklist output (e.g., "Add workspace entry to package.json").
   */
  description?: string;
}

/**
 * @internal
 */
export interface TransformFileStepContext extends WorkflowContext {
  filePath: string;
  transform: (content: string) => string;
  description: string;
}

/**
 * Programmatically transforms a file's content. Reads the file, applies the
 * transform function, and writes the result back. Useful for structured edits
 * (JSON, YAML, etc.) that are too mechanical for an agent prompt but need more
 * control than template copying.
 */
export const TransformFileStepMachine = setup({
  types: {
    input: {} as TransformFileStepInput & WorkflowInput,
    context: {} as TransformFileStepContext,
    output: {} as WorkflowOutput,
  },
  actions: {
    ...workflowActions,
  },
  actors: {
    ...workflowActors,
    transformFile: fromPromise(
      async ({ input }: { input: TransformFileStepContext }) => {
        if (input.runMode === "dry" || input.runMode === "checklist") {
          return;
        }
        const content = readFileSync(input.filePath, "utf-8");
        const updated = input.transform(content);
        writeFileSync(input.filePath, updated, "utf-8");
      },
    ),
  },
}).createMachine({
  id: "transform-file-step",
  initial: "transform",
  context: ({ input }) => {
    const resolvedPath = input.filePath.startsWith("/")
      ? input.filePath
      : path.join(input.cwd || process.cwd(), input.filePath);
    return {
      ...contextFromInput(input),
      filePath: resolvedPath,
      transform: input.transform,
      description: input.description ?? `Transform ${input.filePath}`,
    };
  },
  states: {
    transform: {
      invoke: {
        src: "transformFile",
        input: ({ context }) => context,
        onDone: {
          target: "done",
          actions: logInfo(
            ({ context }) => context.description,
          ),
        },
      },
    },
    done: {
      type: "final",
    },
  },
  output: ({ context }) => ({
    checklist: {
      description: context.description,
    },
  }),
});
