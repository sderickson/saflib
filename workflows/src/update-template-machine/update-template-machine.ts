import { raise } from "xstate";
import {
  logError,
  promptAgent,
  type FactoryFunctionOptions,
} from "../xstate.ts";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { TemplateWorkflowContext } from "../types.ts";
import type { WorkflowContext } from "../xstate.ts";

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
          },
        ],
      },
    },
  };
}
