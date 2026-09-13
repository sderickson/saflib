import type { StepFn } from "../types.ts";
import type { CommandStepInput } from "./command.ts";
import { runCommandStep } from "./command.ts";
import { buildNpmRunArgs, validateNpmScriptTarget } from "./npm-script-validation.ts";

export interface NpmScriptStepInput {
  workspace: string;
  script: string;
  args?: string[];
  ignoreError?: boolean;
  errorPrompt?: string;
  forceInScript?: boolean;
}

/**
 * Runs `npm run <script> -w <workspace>`, delegating execution to
 * `runCommandStep`. Validates the workspace/script exist first, in every
 * mode (same policy as the old `NpmScriptStepMachine`).
 */
export const runNpmScriptStep: StepFn<NpmScriptStepInput> = async (rawInput, ctx) => {
  const input = rawInput as NpmScriptStepInput;

  try {
    validateNpmScriptTarget({
      workspace: input.workspace,
      script: input.script,
      startDir: ctx.originalWorkingDirectory,
      runMode: ctx.mode,
    });
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : String(error),
    };
  }

  const commandInput: CommandStepInput = {
    command: "npm",
    args: buildNpmRunArgs(input.workspace, input.script, input.args),
    ignoreError: input.ignoreError,
    errorPrompt: input.errorPrompt,
    forceInScript: input.forceInScript,
  };

  return runCommandStep(commandInput, ctx);
};
