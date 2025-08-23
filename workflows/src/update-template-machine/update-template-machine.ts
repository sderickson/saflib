import { assign, raise } from "xstate";
import {
  logError,
  promptAgent,
  type ComposerFunctionOptions,
} from "../xstate.ts";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { WorkflowContext } from "../xstate.ts";
import type { TemplateWorkflowContext } from "../types.ts";

/**
 * Options for the updateTemplateFileComposer function.
 */
interface UpdateTemplateFileComposerOptions<C extends WorkflowContext>
  extends ComposerFunctionOptions {
  /**
   * Path to the file to update. Can be a string or a function that returns a string.
   * The string is expected to be resolved
   */
  filePath: string | ((context: C) => string);

  /**
   * Message to prompt the agent with.
   */
  promptMessage: string | ((context: C) => string);
}

/**
 * Composer for updating files copied by states from copyTemplateStateComposer.
 * Use this to provide specific instructions on how to update each file. In
 * addition to prompting the agent to make changes, this will block the agent
 * from continuing until all "todo" strings are gone from the file.
 */
export function updateTemplateFileComposer<C extends TemplateWorkflowContext>({
  filePath,
  promptMessage,
  stateName,
  nextStateName,
}: UpdateTemplateFileComposerOptions<C>) {
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
              if (context.dryRun) {
                return false;
              }
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
            actions: [
              assign({
                checklist: ({ context }) => {
                  const castC = context as C; // Unclear how to avoid this cast
                  return [
                    ...context.checklist,
                    {
                      description: `Update ${typeof filePath === "string" ? filePath : filePath(castC).split("/").pop()} to remove TODOs`,
                    },
                  ];
                },
              }),
            ],
          },
        ],
      },
    },
  };
}
