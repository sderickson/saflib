import path from "node:path";
import type { StepFn } from "../types.ts";
import { validateCdTarget } from "./cd-validation.ts";

export interface CdStepInput {
  path: string;
}

/**
 * Updates the current working directory for subsequent steps. Synchronous,
 * no agent/stream interaction beyond a `tool`-channel status line — same
 * validation as the old `CdStepMachine` (`validateCdTarget`).
 */
export const runCdStep: StepFn<CdStepInput> = async (rawInput, ctx) => {
  const input = rawInput as CdStepInput;
  const newCwd = input.path.startsWith("/")
    ? input.path
    : path.join(ctx.originalWorkingDirectory, input.path);

  try {
    validateCdTarget(newCwd, ctx.mode, ctx.copiedFiles);
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : String(error),
    };
  }

  const relativeCwd = path.relative(ctx.originalWorkingDirectory, newCwd);
  ctx.log({
    channel: "tool",
    level: "info",
    content: `Change working directory to ${relativeCwd === "" ? "." : relativeCwd}`,
  });

  return { status: "success", result: { newCwd } };
};
