import { fromPromise, setup, assign } from "xstate";
import { workflowActions, workflowActors, logInfo } from "../xstate.ts";
import {
  type WorkflowContext,
  type WorkflowInput,
  type WorkflowOutput,
} from "../types.ts";
import { contextFromInput } from "../utils.ts";
import { raise } from "xstate";
import path from "node:path";
import { getSourceUrl } from "../store.ts";
import { handlePrompt } from "../prompt.ts";

/**
 * Input for the DocStepMachine.
 */
export interface DocStepInput {
  /**
   * The id of the document to review. Must match one of the keys in the `docFiles` property for the workflow.
   */
  docId: string;
}

/**
 * @internal
 */
export interface DocStepContext extends WorkflowContext {
  docId: string;
  shouldContinue?: boolean;
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
    reviewDoc: fromPromise(async ({ input }: { input: DocStepContext }) => {
      if (input.runMode === "dry") {
        return { shouldContinue: true };
      }

      const docPath = input.docFiles![input.docId];
      if (!docPath) {
        throw new Error(
          `Document with id "${input.docId}" not found in docFiles`,
        );
      }

      if (!docPath.endsWith(".md")) {
        throw new Error(`Document "${input.docId}" is not a markdown file`);
      }

      if (input.runMode === "script") {
        return { shouldContinue: true };
      }

      const { sessionId, shouldContinue } = await handlePrompt({
        context: input,
        msg: `Please review the following documentation: ${docPath}`,
      });
      const agentConfig = input.agentConfig;
      return {
        shouldContinue,
        newConfig: agentConfig ? { ...agentConfig, sessionId } : undefined,
      };
    }),
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
        src: "reviewDoc",
        input: ({ context }) => context,
        onDone: [
          {
            actions: [
              assign({
                agentConfig: ({ event, context }) => {
                  return event.output.newConfig || context.agentConfig;
                },
                shouldContinue: ({ event }) => {
                  return event.output.shouldContinue;
                },
              }),
            ],
            target: "standby",
          },
        ],
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
        continue: [
          {
            target: "reviewDoc",
            guard: ({ context }) => {
              return context.runMode === "run";
            },
          },
          {
            target: "done",
          },
        ],
      },
    },

    standby: {
      entry: raise({ type: "maybeContinue" }),
      on: {
        maybeContinue: {
          guard: ({ context }) => {
            return !!context.shouldContinue;
          },
          target: "done",
        },
        continue: {
          target: "done",
        },
      },
    },
    done: {
      type: "final",
    },
  },
  output: ({ context }) => {
    const docPath = context.docFiles![context.docId];
    const githubPath = getSourceUrl(docPath);
    return {
      checklist: {
        description: `Review documentation: [${path.basename(docPath)}](${githubPath})`,
      },
    };
  },
});
