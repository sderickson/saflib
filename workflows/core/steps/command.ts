import { assign, fromPromise, setup } from "xstate";
import {
  type WorkflowContext,
  type WorkflowInput,
  type WorkflowOutput,
} from "../types.ts";
import {
  workflowActions,
  workflowActors,
  runCommandAsync,
  logInfo,
  logError,
  promptAgent,
} from "../xstate.ts";
import { raise } from "xstate";
import { contextFromInput } from "../utils.ts";

/**
 * A function that determines if the command should be skipped. Given the context and cwd.
 */
export type CommandStepSkipIf = (
  context: CommandStepContext & { cwd: string },
) => Promise<boolean>;

/**
 * Input for the CommandStepMachine. These arguments are passed to Node's [`spawn`](https://nodejs.org/api/child_process.html#child_processspawncommand-args-options) function.
 */
export interface CommandStepInput {
  /**
   * The command to run, such as `npm` or `chmod`.
   */
  command: string;

  /**
   * List of arguments to pass to the command.
   */
  args?: string[];

  skipIf?: CommandStepSkipIf;

  /**
   * The environment variables to set for the command.
   */
  promptOnError?: string;
}

/**
 * @internal
 */
export interface CommandStepContext extends WorkflowContext {
  command: string;
  args: string[];
  skipIf?: CommandStepSkipIf;
  promptOnError?: string;
}

/**
 * Runs a shell command as part of a workflow. Stops the workflow if the command fails.
 */
export const CommandStepMachine = setup({
  types: {
    input: {} as CommandStepInput & WorkflowInput,
    context: {} as CommandStepContext,
    output: {} as WorkflowOutput,
  },
  actions: {
    ...workflowActions,
  },
  actors: {
    ...workflowActors,
  },
}).createMachine({
  id: "command-step",
  context: ({ input, self }) => {
    return {
      ...contextFromInput(input, self),
      command: input.command,
      args: input.args || [],
      promptOnError: input.promptOnError,
    };
  },
  initial: "printBefore",
  states: {
    printBefore: {
      entry: raise({ type: "printBefore" }),
      on: {
        printBefore: {
          target: "runCommand",
          actions: logInfo(
            ({ context }) =>
              `Running command: ${context.command} ${context.args.join(" ")}`,
          ),
        },
      },
    },
    runCommand: {
      invoke: {
        src: fromPromise(async ({ input }: { input: CommandStepContext }) => {
          if (input.runMode === "dry") {
            return "Dry run";
          }
          if (input.skipIf && (await input.skipIf(input))) {
            logInfo(
              `Skipping command: ${input.command} ${input.args.join(" ")}`,
            );
            return "Skipped";
          }
          return await runCommandAsync(input.command, input.args, {
            cwd: input.cwd,
          });
        }),
        input: ({ context }) => context,
        onDone: {
          target: "done",
          actions: [
            logInfo(
              ({ context }) =>
                `Successfully ran \`${context.command} ${context.args.join(" ")}\``,
            ),
            assign({
              checklist: ({ context }) => {
                return [
                  ...context.checklist,
                  {
                    description: `Run \`${context.command} ${context.args.join(" ")}\``,
                  },
                ];
              },
            }),
          ],
        },
        onError: {
          actions: [
            logError(
              ({ event, context }) =>
                `Command failed: ${(event.error as Error).message} ${context.promptOnError ? `\n${context.promptOnError}` : ""}`,
            ),
            raise({ type: "prompt" }),
          ],
        },
      },
      on: {
        prompt: {
          actions: promptAgent(
            ({ context }) =>
              `The command \`${context.command} ${context.args.join(" ")}\` failed. Please fix the issues and continue. ${context.promptOnError ? `\n${context.promptOnError}` : ""}`,
          ),
        },
        continue: {
          reenter: true,
          target: "runCommand",
        },
      },
    },
    done: {
      type: "final",
    },
  },
  output: ({ context }) => {
    return {
      checklist: {
        description: `Run \`${context.command} ${context.args.join(" ")}\``,
      },
    };
  },
});
