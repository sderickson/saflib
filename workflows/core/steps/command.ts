import { assign, fromPromise, setup } from "xstate";
import {
  type WorkflowContext,
  type WorkflowInput,
  type WorkflowOutput,
} from "../types.ts";
import {
  workflowActions,
  workflowActors,
  logInfo,
  logError,
} from "../xstate.ts";
import { raise } from "xstate";
import { contextFromInput } from "../utils.ts";
import { executeCommandStep } from "./command-runner.ts";

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
   * @deprecated Use `errorPrompt` instead.
   */
  promptOnError?: string;

  /**
   * The message to show to the agent if the command fails.
   */
  errorPrompt?: string;

  /**
   * When true, run this command even in script mode if it would otherwise be
   * treated as a skipped validation command (typecheck/test). Use from CI
   * harnesses that intentionally typecheck after scaffolding.
   */
  forceInScript?: boolean;
}

/**
 * @internal
 */
export interface CommandStepContext extends WorkflowContext {
  command: string;
  args: string[];
  errorPrompt?: string;
  ignoreError?: boolean;
  forceInScript?: boolean;
  shouldContinue?: boolean;
}

/**
 * In script mode, skip agent-loop validation commands. Mechanical steps
 * (install, saf-specs generate, prettier, …) still run; typecheck/test of
 * unfinished scaffolds is asserted separately by CI harnesses when needed.
 */
export function isScriptModeValidationCommand(
  command: string,
  args: string[],
): boolean {
  if (command === "npm" && args[0] === "run") {
    const script = args[1] ?? "";
    if (
      script === "typecheck" ||
      script === "test" ||
      script === "test:watch" ||
      script === "test:coverage" ||
      script === "test:e2e" ||
      script === "test:e2e:ui"
    ) {
      return true;
    }
  }
  if (command === "npx" && args[0] === "tsc") {
    return true;
  }
  if (command === "vitest" || command === "vue-tsc") {
    return true;
  }
  return false;
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
    runCommand: fromPromise(
      async ({ input }: { input: CommandStepContext }) =>
        executeCommandStep(input),
    ),
  },
}).createMachine({
  id: "command-step",
  context: ({ input }) => {
    return {
      ...contextFromInput(input),
      command: input.command,
      args: input.args || [],
      errorPrompt: input.promptOnError ?? input.errorPrompt ?? "",
      ignoreError: input.ignoreError,
      forceInScript: input.forceInScript,
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
            // Script/CI must fail fast — standby waits for an agent "continue".
            // Keep this in an action (not a `guard`) so the exported machine
            // type stays portable without referencing xstate's GuardArgs.
            ({ context, event }) => {
              if (
                context.runMode === "script" ||
                context.runMode === "dry" ||
                context.runMode === "checklist"
              ) {
                throw event.error instanceof Error
                  ? event.error
                  : new Error(String(event.error));
              }
            },
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
              console.log(
                `The command \`${context.command} ${context.args.join(" ")}\` failed.\nCWD: ${context.cwd}.\n${context.errorPrompt ? `\n${context.errorPrompt}` : ""}`,
              );
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
