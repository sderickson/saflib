import { spawn, type SpawnOptions } from "node:child_process";
import type { WorkflowContext } from "../types.ts";

/**
 * Port of the old `runCommandAsync` (`xstate-actions/utils.ts`), except it
 * captures stdout/stderr into the step's output stream (`terminal` channel)
 * instead of inheriting the parent's stdio — the whole point of the streams
 * change is making command output pipeable. Intentional behavior change,
 * documented in spec.md.
 */
export function runCommandAsync(
  command: string,
  args: string[],
  options: Pick<SpawnOptions, "cwd">,
  ctx: WorkflowContext,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: options.cwd });
    child.stdout?.on("data", (data: Buffer) => {
      ctx.log({ channel: "terminal", level: "info", content: data.toString() });
    });
    child.stderr?.on("data", (data: Buffer) => {
      ctx.log({ channel: "terminal", level: "error", content: data.toString() });
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command exited with code ${code}: ${command} ${args.join(" ")}`));
      }
    });
  });
}

export function isScriptModeValidationCommand(
  command: string,
  args: string[],
): boolean {
  if (command === "npm" && args[0] === "run") {
    const script = args[1] ?? "";
    if (
      ["typecheck", "test", "test:watch", "test:coverage", "test:e2e", "test:e2e:ui"].includes(
        script,
      )
    ) {
      return true;
    }
  }
  if (command === "npm" && args[0] === "exec" && args[1] === "tsc") return true;
  if (command === "npx" && args[0] === "tsc") return true;
  if (command === "vitest" || command === "vue-tsc") return true;
  return false;
}
