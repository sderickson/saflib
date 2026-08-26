import { assign, fromPromise, raise, setup } from "xstate";
import type { WorkflowInput, WorkflowOutput } from "../types.ts";
import { contextFromInput } from "../utils.ts";
import { workflowActions, workflowActors, logInfo, logError } from "../xstate.ts";
import { type CommandStepContext, type CommandStepInput } from "./command.ts";
import { executeCommandStep } from "./command-runner.ts";
import {
  buildNpmRunArgs,
  formatNpmScriptCommand,
  validateNpmScriptTarget,
} from "./npm-script-validation.ts";

/**
 * Input for the NpmScriptStepMachine.
 */
export interface NpmScriptStepInput {
  /**
   * npm workspace name, e.g. `@fixture/npm-script-child`.
   */
  workspace: string;

  /**
   * npm script name from the target workspace package.json, e.g. `test`.
   */
  script: string;

  /**
   * Arguments forwarded after `--` to the underlying script.
   */
  args?: string[];

  ignoreError?: boolean;

  /**
   * @deprecated Use `errorPrompt` instead.
   */
  promptOnError?: string;

  errorPrompt?: string;

  /**
   * When true, run this script even in script mode if it would otherwise be
   * treated as a skipped validation command (typecheck/test).
   */
  forceInScript?: boolean;
}

/**
 * @internal
 */
export interface NpmScriptStepContext extends CommandStepContext {
  workspace: string;
  script: string;
  scriptArgs: string[];
}

export function npmScriptToCommandInput(
  input: NpmScriptStepInput & WorkflowInput,
): CommandStepInput & WorkflowInput {
  const startDir =
    input.originalWorkingDirectory ?? input.cwd ?? process.cwd();
  validateNpmScriptTarget({
    workspace: input.workspace,
    script: input.script,
    startDir,
    runMode: input.runMode ?? "print",
  });

  return {
    ...input,
    command: "npm",
    args: buildNpmRunArgs(input.workspace, input.script, input.args),
  };
}

/**
 * Runs `npm run <script> -w <workspace>` with workspace/script validation in
 * dry, checklist, print, run, and script modes. Delegates execution to the same
 * runner used by CommandStepMachine.
 */
export const NpmScriptStepMachine = setup({
  types: {
    input: {} as NpmScriptStepInput & WorkflowInput,
    context: {} as NpmScriptStepContext,
    output: {} as WorkflowOutput,
  },
  actions: {
    ...workflowActions,
  },
  actors: {
    ...workflowActors,
    runCommand: fromPromise(
      async ({ input }: { input: NpmScriptStepContext }) =>
        executeCommandStep(input),
    ),
  },
}).createMachine({
  id: "npm-script-step",
  context: ({ input }) => {
    const commandInput = npmScriptToCommandInput(input);
    return {
      ...contextFromInput(input),
      workspace: input.workspace,
      script: input.script,
      scriptArgs: input.args ?? [],
      command: commandInput.command,
      args: commandInput.args ?? [],
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
          actions: logInfo(({ context }) => {
            return `Running npm script: ${formatNpmScriptCommand(context.workspace, context.script, context.scriptArgs)}`;
          }),
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
            logInfo(({ context }) => {
              return `Successfully ran \`${formatNpmScriptCommand(context.workspace, context.script, context.scriptArgs)}\``;
            }),
            assign({
              checklist: ({ context }) => {
                return [
                  ...context.checklist,
                  {
                    description: `Run \`${formatNpmScriptCommand(context.workspace, context.script, context.scriptArgs)}\``,
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
                `npm script failed: ${(event.error as Error).message}`,
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
              console.log(
                `The command \`${formatNpmScriptCommand(context.workspace, context.script, context.scriptArgs)}\` failed.\nCWD: ${context.cwd}.\n${context.errorPrompt ? `\n${context.errorPrompt}` : ""}`,
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
        description: `Run \`${formatNpmScriptCommand(context.workspace, context.script, context.scriptArgs)}\``,
      },
    };
  },
});
