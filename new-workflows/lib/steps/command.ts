import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
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
  return `The command \`${input.command} ${(input.args ?? []).join(" ")}\` failed.\nCWD: ${ctx.cwd}.\n${error.message}\n\n${fixScopeNote(ctx)}${input.errorPrompt ? `\n${input.errorPrompt}` : ""}`;
}

/**
 * Keeps the agent's fix to what this run broke. Without it, a failure the
 * run didn't cause (a missing script, a flaky or already-broken test)
 * tends to get "fixed" with new tooling or tests nobody asked for.
 */
function fixScopeNote(ctx: WorkflowContext): string {
  const note =
    "Fix only failures this run's changes caused. If a failure has nothing to do with this run, or was already failing, don't work around it (no new scripts, test setup or skipped tests): say what's wrong in your final message and leave it for a person.";
  if (!ctx.expectedFiles?.length) return note;
  return `${note}\nKeep fixes within the run's expected files (relative to ${ctx.originalWorkingDirectory}); changes outside them are flagged for review:\n${ctx.expectedFiles.map((file) => `- ${file}`).join("\n")}`;
}

/**
 * `npm run <script>` in a package without that script can't be fixed by
 * the step itself: the plan named the wrong script or package.
 */
function missingNpmScript(input: CommandStepInput, cwd: string): string | undefined {
  const args = input.args ?? [];
  if (input.command !== "npm" || (args[0] !== "run" && args[0] !== "run-script")) return undefined;
  const script = args[1];
  if (!script || script.startsWith("-") || args.includes("-w") || args.some((a) => a.startsWith("--workspace"))) {
    return undefined;
  }
  const packageJsonPath = path.join(cwd, "package.json");
  if (!existsSync(packageJsonPath)) return undefined;
  try {
    const scripts = (JSON.parse(readFileSync(packageJsonPath, "utf-8")) as { scripts?: Record<string, string> })
      .scripts;
    if (scripts?.[script]) return undefined;
  } catch {
    return undefined;
  }
  return `There is no "${script}" script in ${packageJsonPath}, so \`npm run ${script}\` can't pass here. Fix the workflow step (wrong script or wrong directory), then retry.`;
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
  // Checked before script mode skips validation commands, so validating a
  // plan catches a test step pointed at a package with no test script.
  const missingScript = missingNpmScript(input, ctx.cwd);
  if (missingScript && !input.ignoreError) {
    return { status: "error", message: missingScript };
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
