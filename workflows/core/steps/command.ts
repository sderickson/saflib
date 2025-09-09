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
}

export interface CommandStepContext extends WorkflowContext {
  command: string;
  args: string[];
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
              `Running command: ${context.command} ${context.args.join(" ")}`
          ),
        },
      },
    },
    runCommand: {
      invoke: {
        src: fromPromise(
          async ({
            input: { command, args, dryRun },
          }: {
            input: CommandStepContext;
          }) => {
            if (dryRun) {
              return "Dry run";
            }
            return await runCommandAsync(command, args);
          }
        ),
        input: ({ context }) => context,
        onDone: {
          target: "done",
          actions: [
            logInfo(
              ({ context }) =>
                `Successfully ran \`${context.command} ${context.args.join(" ")}\``
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
              ({ event }) => `Command failed: ${(event.error as Error).message}`
            ),
            raise({ type: "prompt" }),
          ],
        },
      },
      on: {
        prompt: {
          actions: promptAgent(
            ({ context }) =>
              `The command \`${context.command} ${context.args.join(" ")}\` failed. Please fix the issues and continue.`
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
