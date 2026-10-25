import type { StepFn } from "../types.ts";
import { runAgentTurn } from "../agents/dispatch.ts";

export interface PromptStepInput {
  prompt: string;
  /** See `WorkflowStep.expectedFiles`. Listed after the prompt. */
  files?: string[];
}

/**
 * Prompts the agent (mode `run`) or hands the prompt to the caller (mode
 * `print`) to do an arbitrary task. `dry`/`checklist`/`script` skip
 * entirely — same short-circuit as the old `PromptStepMachine`.
 */
export const runPromptStep: StepFn<PromptStepInput> = async (rawInput, ctx) => {
  const input = rawInput as PromptStepInput;
  const body = input.files?.length
    ? `${input.prompt}\n\n${expectedFilesNote(input.files, ctx.originalWorkingDirectory)}`
    : input.prompt;
  const prompt = ctx.extraPrompt ? `${ctx.extraPrompt}\n\n${body}` : body;

  if (ctx.mode === "dry" || ctx.mode === "checklist" || ctx.mode === "script") {
    return { status: "success" };
  }

  if (ctx.mode === "print") {
    if (ctx.isResume) {
      // The caller (e.g. the CLI's `next`) says the external agent is done.
      return { status: "success" };
    }
    ctx.log({ channel: "agent-input", level: "info", content: prompt });
    return { status: "awaiting_prompt", prompt };
  }

  ctx.log({ channel: "agent-input", level: "info", content: prompt });

  // mode === "run"
  const { shouldContinue } = await runAgentTurn(prompt, ctx);
  if (!shouldContinue) {
    return { status: "awaiting_prompt", prompt };
  }
  return { status: "success" };
};

function expectedFilesNote(files: string[], root: string): string {
  return `Files this step is expected to change (relative to ${root}):
${files.map((file) => `- ${file}`).join("\n")}

If you need to change other files, you can, but say which ones and why in your final message. Changes outside the plan's expected files are flagged for review.`;
}
