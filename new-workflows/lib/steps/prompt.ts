import type { StepFn } from "../types.ts";
import { runAgentTurn } from "../agents/dispatch.ts";

export interface PromptStepInput {
  prompt: string;
}

/**
 * Prompts the agent (mode `run`) or hands the prompt to the caller (mode
 * `print`) to do an arbitrary task. `dry`/`checklist`/`script` skip
 * entirely — same short-circuit as the old `PromptStepMachine`.
 */
export const runPromptStep: StepFn<PromptStepInput> = async (rawInput, ctx) => {
  const input = rawInput as PromptStepInput;

  if (ctx.mode === "dry" || ctx.mode === "checklist" || ctx.mode === "script") {
    return { status: "success" };
  }

  if (ctx.mode === "print") {
    if (ctx.isResume) {
      // The caller (e.g. the CLI's `next`) says the external agent is done.
      return { status: "success" };
    }
    ctx.log({ channel: "agent-input", level: "info", content: input.prompt });
    return { status: "awaiting_prompt", prompt: input.prompt };
  }

  ctx.log({ channel: "agent-input", level: "info", content: input.prompt });

  // mode === "run"
  const { shouldContinue } = await runAgentTurn(input.prompt, ctx);
  if (!shouldContinue) {
    return { status: "awaiting_prompt", prompt: input.prompt };
  }
  return { status: "success" };
};
