import { assign, fromPromise, setup } from "xstate";
import {
  workflowActions,
  workflowActors,
  type WorkflowContext,
  type WorkflowInput,
  type WorkflowOutput,
  logInfo,
  promptAgent,
} from "../../src/xstate.ts";
import { contextFromInput } from "../../src/workflow.ts";
import { raise } from "xstate";
import { readFileSync } from "fs";
import path from "node:path";

interface DocMachineInput extends WorkflowInput {
  docId: string;
}

interface DocMachineContext extends WorkflowContext {
  docId: string;
}

export const DocStepMachine = setup({
  types: {
    input: {} as DocMachineInput,
    context: {} as DocMachineContext,
    output: {} as WorkflowOutput,
  },
  actions: {
    ...workflowActions,
  },
  actors: {
    ...workflowActors,
  },
}).createMachine({
  id: "doc-step",
  context: ({ input }) => {
    return {
      ...contextFromInput(input),
      docId: input.docId,
    };
  },
  initial: "reviewDoc",
  states: {
    reviewDoc: {
      invoke: {
        src: fromPromise(
          async ({
            input: { docId, docFiles, dryRun },
          }: {
            input: {
              docId: string;
              docFiles: Record<string, string>;
              dryRun: boolean;
            };
          }) => {
            if (dryRun) {
              return "Dry run - would review documentation";
            }

            const docPath = docFiles[docId];
            if (!docPath) {
              throw new Error(
                `Document with id "${docId}" not found in docFiles`,
              );
            }

            if (!docPath.endsWith(".md")) {
              throw new Error(`Document "${docId}" is not a markdown file`);
            }

            // Read the document content
            const content = readFileSync(docPath, "utf-8");
            return content;
          },
        ),
        input: ({ context }) => {
          return {
            docId: context.docId,
            docFiles: context.docFiles || {},
            dryRun: context.dryRun,
          };
        },
        onDone: {
          target: "done",
          actions: [
            logInfo(({ context }) => {
              const docPath = context.docFiles![context.docId];
              return `Successfully loaded documentation: ${path.basename(docPath)}`;
            }),
            assign({
              checklist: ({ context }) => {
                const docPath = context.docFiles![context.docId];
                return [
                  ...context.checklist,
                  {
                    description: `Review documentation: ${path.basename(docPath)}`,
                  },
                ];
              },
            }),
            promptAgent(({ context, event }) => {
              const docPath = context.docFiles![context.docId];
              const content = event.output as string;
              return `Please review the following documentation:

**File:** ${docPath}

${content}

Please read through this documentation carefully and understand the guidelines before proceeding.`;
            }),
          ],
        },
        onError: {
          actions: [
            logInfo(
              ({ event }) =>
                `Failed to load documentation: ${(event.error as Error).message}`,
            ),
            raise({ type: "prompt" }),
          ],
        },
      },
      on: {
        prompt: {
          actions: promptAgent(
            ({ context }) =>
              `Failed to load documentation for "${context.docId}". Please check that the document exists and is accessible.`,
          ),
        },
        continue: {
          reenter: true,
          target: "reviewDoc",
        },
      },
    },
    done: {
      type: "final",
    },
  },
  output: ({ context }) => {
    const docPath = context.docFiles![context.docId];
    return {
      checklist: [
        {
          description: `Review documentation: ${path.basename(docPath)}`,
        },
      ],
    };
  },
});
