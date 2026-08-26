import { handlePrompt } from "../prompt.ts";
import { runCommandAsync } from "../xstate-actions/utils.ts";
import type { CommandStepContext } from "./command.ts";
import { isScriptModeValidationCommand } from "./command.ts";

const messageForContext = (ctx: CommandStepContext) => {
  return `The command \`${ctx.command} ${ctx.args.join(" ")}\` failed.\nCWD: ${ctx.cwd}.\n${ctx.errorPrompt ? `\n${ctx.errorPrompt}` : ""}`;
};

/**
 * Shared command execution loop used by CommandStepMachine and NpmScriptStepMachine.
 */
export async function executeCommandStep(
  input: CommandStepContext,
): Promise<{ shouldContinue: true } | string> {
  if (input.runMode === "dry" || input.runMode === "checklist") {
    return `Skipped because mode is ${input.runMode}.`;
  }
  if (
    input.runMode === "script" &&
    !input.forceInScript &&
    isScriptModeValidationCommand(input.command, input.args)
  ) {
    return `Skipped validation command in script mode: ${input.command} ${input.args.join(" ")}`;
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
}
