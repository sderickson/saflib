import type { StepFn, WorkflowContext } from "../types.ts";
import { runAgentTurn } from "../agents/dispatch.ts";
import { isScriptModeValidationCommand, runCommandAsync } from "./command-runner.ts";

export interface CommandStepInput {
  command: string;
  args?: string[];
  ignoreError?: boolean;
  errorPrompt?: string;
  /** Run even in script mode if it would otherwise be a skipped validation command. */
  forceInScript?: boolean;
}

function errorMessage(input: CommandStepInput, ctx: WorkflowContext, error: Error): string {
  return `The command \`${input.command} ${(input.args ?? []).join(" ")}\` failed.\nCWD: ${ctx.cwd}.\n${error.message}${input.errorPrompt ? `\n${input.errorPrompt}` : ""}`;
}

/**
 * Runs a shell command. Same mode policy as the old `CommandStepMachine`:
 * `dry`/`checklist` skip; `script` skips validation commands (typecheck/test)
 * unless `forceInScript`, and a failure there is a hard error (no retry);
 * `print` surfaces the failure as `awaiting_prompt` so the caller can retry
 * the same step externally; `run` lets the agent see the failure and retries
 * (up to 4 tries) if it reports it fixed something.
 */
export const runCommandStep: StepFn<CommandStepInput> = async (rawInput, ctx) => {
  const input = rawInput as CommandStepInput;
  const args = input.args ?? [];

  if (ctx.mode === "dry" || ctx.mode === "checklist") {
    return { status: "success" };
  }
  if (
    ctx.mode === "script" &&
    !input.forceInScript &&
    isScriptModeValidationCommand(input.command, args)
  ) {
    ctx.log({
      channel: "tool",
      level: "info",
      content: `Skipped validation command in script mode: ${input.command} ${args.join(" ")}`,
    });
    return { status: "success" };
  }

  ctx.log({ channel: "tool", level: "info", content: `Running command: ${input.command} ${args.join(" ")}` });

  let tries = 0;
  while (true) {
    try {
      await runCommandAsync(input.command, args, { cwd: ctx.cwd }, ctx);
      ctx.log({ channel: "tool", level: "info", content: `Successfully ran \`${input.command} ${args.join(" ")}\`` });
      return { status: "success" };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      if (input.ignoreError) {
        return { status: "success" };
      }
      if (ctx.mode === "script") {
        return { status: "error", message: errorMessage(input, ctx, err) };
      }
      if (ctx.mode === "print") {
        return {
          status: "awaiting_prompt",
          prompt: errorMessage(input, ctx, err),
        };
      }
      // mode === "run"
      if (tries >= 3) {
        return { status: "error", message: errorMessage(input, ctx, err) };
      }
      const { shouldContinue } = await runAgentTurn(errorMessage(input, ctx, err), ctx);
      if (!shouldContinue) {
        return { status: "awaiting_prompt", prompt: errorMessage(input, ctx, err) };
      }
      tries++;
    }
  }
};
