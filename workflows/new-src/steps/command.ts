import { assign, fromPromise, setup } from "xstate";
import {
  workflowActions,
  workflowActors,
  type WorkflowContext,
  type WorkflowInput,
  type WorkflowOutput,
  runCommandAsync,
  logInfo,
  logError,
  promptAgent,
} from "../../src/xstate.ts";
import { raise } from "xstate";
import { contextFromInput } from "../../src/workflow.ts";

interface CommandMachineInput extends WorkflowInput {
  command: string;
  args?: string[];
}

interface CommandMachineContext extends WorkflowContext {
  command: string;
  args: string[];
}

export const CommandStepMachine = setup({
  types: {
    input: {} as CommandMachineInput,
    context: {} as CommandMachineContext,
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
  context: ({ input }) => {
    return {
      ...contextFromInput(input),
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
              `Running command: ${context.command} ${context.args.join(" ")}`,
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
            input: CommandMachineContext;
          }) => {
            if (dryRun) {
              return "Dry run";
            }
            return await runCommandAsync(command, args);
          },
        ),
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
              ({ event }) =>
                `Command failed: ${(event.error as Error).message}`,
            ),
            raise({ type: "prompt" }),
          ],
        },
      },
      on: {
        prompt: {
          actions: promptAgent(
            ({ context }) =>
              `The command \`${context.command} ${context.args.join(" ")}\` failed. Please fix the issues and continue.`,
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
      checklist: [
        {
          description: `Run \`${context.command} ${context.args.join(" ")}\``,
        },
      ],
    };
  },
});
