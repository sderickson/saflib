import { readFileSync } from "node:fs";
import type { StepFn } from "../types.ts";
import { runAgentTurn } from "../agents/dispatch.ts";

export interface UpdateStepInput {
  /** Id into `ctx.copiedFiles`, i.e. a file the copy step already wrote. */
  fileId: string;
  prompt?: string;
}

const TODO_REGEX = /\s*(?:#|\/\/).*todo/i;

/**
 * Prompts the agent to update a file the copy step produced, then blocks on
 * TODO markers until they're resolved (or 3 tries are exhausted) — same
 * behavior as the old `UpdateStepMachine`.
 */
export const runUpdateStep: StepFn<UpdateStepInput> = async (rawInput, ctx) => {
  const input = rawInput as UpdateStepInput;
  const filePath = ctx.copiedFiles[input.fileId];
  if (!filePath) {
    return {
      status: "error",
      message: `copiedFiles[${input.fileId}] not found. Did the copy step run first?`,
    };
  }
  const prompt = input.prompt ?? `Update \`${filePath}\`.`;

  if (ctx.mode === "dry" || ctx.mode === "checklist" || ctx.mode === "script") {
    return { status: "success", result: { filePath } };
  }

  ctx.log({ channel: "agent-input", level: "info", content: prompt });

  if (ctx.mode === "print") {
    return { status: "awaiting_prompt", prompt };
  }

  // mode === "run"
  let { shouldContinue } = await runAgentTurn(prompt, ctx);

  let tries = 1;
  while (!ctx.skipTodos) {
    const hasTodos = TODO_REGEX.test(readFileSync(filePath, "utf-8"));
    if (!hasTodos) break;
    if (tries > 3) {
      return {
        status: "error",
        message: `Agent failed to remove TODOs from ${filePath}.`,
      };
    }
    const retry = await runAgentTurn(
      `File ${filePath} contains TODO strings. Make sure to resolve them before continuing.`,
      ctx,
    );
    shouldContinue = retry.shouldContinue;
    if (!shouldContinue) break;
    tries++;
  }

  if (!shouldContinue) {
    return { status: "awaiting_prompt", prompt };
  }
  return { status: "success", result: { filePath } };
};
