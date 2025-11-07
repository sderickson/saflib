import { type PromptParam, type PromptResult } from "../types.ts";
import { printLineSlowly } from "./print.ts";

export const executePromptWithMock = async ({msg}: PromptParam): Promise<PromptResult> => {
  printLineSlowly(msg);
  return { code: 0, sessionId: "test-session-id", shouldContinue: true };
};
