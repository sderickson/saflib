import { readFileSync } from "node:fs";
import type { StepFn } from "../types.ts";
import { runAgentTurn } from "../agents/dispatch.ts";

export interface UpdateStepInput {
  /** Id into `ctx.copiedFiles`, i.e. a file the copy step already wrote. */
  fileId: string;
  prompt?: string;
}

// Case-sensitive, and requires the marker as its own word — deliberately
// not `/i`. A product whose own domain vocabulary includes "todo" (e.g. a
// todo-list app) would otherwise trip this on every ordinary comment or
// identifier mentioning it; `TODO` as a genuine marker convention is
// always written in caps.
const TODO_REGEX = /\s*(?:#|\/\/).*\bTODO\b/;

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
  // Always tell the agent the exact file to edit — a custom `prompt`
  // describes what to do, not where, and it's easy for a workflow author
  // to forget to interpolate `filePath` into their own template.
  const basePrompt = input.prompt
    ? `${input.prompt}\n\nFull path: ${filePath}`
    : `Update \`${filePath}\`.`;
  const prompt = ctx.extraPrompt ? `${ctx.extraPrompt}\n\n${basePrompt}` : basePrompt;

  if (ctx.mode === "dry" || ctx.mode === "checklist" || ctx.mode === "script") {
    return { status: "success", result: { filePath } };
  }

  if (ctx.mode === "print") {
    if (ctx.isResume) {
      // The caller (e.g. the CLI's `next`) says the external agent is done —
      // re-check the file for real, same as the old UpdateStepMachine's
      // standby->continue transition.
      const hasTodos = !ctx.skipTodos && TODO_REGEX.test(readFileSync(filePath, "utf-8"));
      if (hasTodos) {
        const retryPrompt = `File ${filePath} contains TODO strings. Make sure to resolve them before continuing.`;
        ctx.log({ channel: "agent-input", level: "info", content: retryPrompt });
        return { status: "awaiting_prompt", prompt: retryPrompt };
      }
      return { status: "success", result: { filePath } };
    }
    ctx.log({ channel: "agent-input", level: "info", content: prompt });
    return { status: "awaiting_prompt", prompt };
  }

  ctx.log({ channel: "agent-input", level: "info", content: prompt });

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
