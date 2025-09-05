import { fromPromise, setup } from "xstate";
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
import path from "node:path";
import { getGitHubUrl } from "@saflib/dev-tools";

/**
 * Input for the DocStepMachine.
 */
export interface DocStepInput {
  /**
   * The id of the document to review. Must match one of the keys in the `docFiles` property for the workflow.
   */
  docId: string;
}

interface DocStepContext extends WorkflowContext {
  docId: string;
}

/**
 * Prompts the agent to read a document from the `docFiles` property for the workflow.
 */
export const DocStepMachine = setup({
  types: {
    input: {} as DocStepInput & WorkflowInput,
    context: {} as DocStepContext,
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
            promptAgent(({ context }) => {
              const docPath = context.docFiles![context.docId];
              return `Please review the following documentation: ${docPath}`;
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
    const githubPath = getGitHubUrl(docPath);
    return {
      checklist: [
        {
          description: `Review documentation: [${path.basename(docPath)}](${githubPath})`,
        },
      ],
    };
  },
});
