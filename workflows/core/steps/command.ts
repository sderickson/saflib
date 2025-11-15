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
} from "../xstate.ts";
import { handlePrompt } from "../prompt.ts";
import { raise } from "xstate";
import { contextFromInput } from "../utils.ts";

/**
 * Input for the CommandStepMachine.
 *
 * These arguments are passed to Node's [`spawn`](https://nodejs.org/api/child_process.html#child_processspawncommand-args-options) function.
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

  ignoreError?: boolean;

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
  promptOnError?: string;
  ignoreError?: boolean;
  shouldContinue?: boolean;
}

const messageForContext = (ctx: CommandStepContext) => {
  return `The command \`${ctx.command} ${ctx.args.join(" ")}\` failed.\nCWD: ${ctx.cwd}.\n${ctx.promptOnError ? `\n${ctx.promptOnError}` : ""}`;
};

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
    runCommand: fromPromise(
      async ({ input }: { input: CommandStepContext }) => {
        if (input.runMode === "dry") {
          return "Dry run";
        }
        let tries = 0;
        while (true) {
          if (tries > 3) {
            throw new Error(
              `Agent failed to fix command: ${input.command} ${input.args.join(" ")}`,
            );
          }

          try {
            await runCommandAsync(input.command, input.args, {
              cwd: input.cwd,
            });
            return {
              shouldContinue: true,
            };
          } catch (error) {
            if (input.ignoreError) {
              return {
                shouldContinue: true,
              };
            }
            const { shouldContinue } = await handlePrompt({
              context: input,
              msg: messageForContext(input),
            });
            if (!shouldContinue) {
              throw error;
            }
            tries++;
          }
        }
      },
    ),
  },
}).createMachine({
  id: "command-step",
  context: ({ input }) => {
    return {
      ...contextFromInput(input),
      command: input.command,
      args: input.args || [],
      promptOnError: input.promptOnError,
      ignoreError: input.ignoreError,
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
        src: "runCommand",
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
          target: "standby",
          actions: [
            logError(
              ({ event }) =>
                `Command failed: ${(event.error as Error).message}`,
            ),
          ],
        },
      },
    },
    standby: {
      on: {
        continue: {
          target: "printBefore",
        },
        prompt: {
          actions: [
            ({ context }) => {
              console.log(messageForContext(context));
            },
          ],
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
