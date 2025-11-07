import { type PromptParam, type PromptResult } from "../types.ts";

export const executePromptWithMock = async ({msg}: PromptParam): Promise<PromptResult> => {
  console.log("Mock message:", msg);
  return { code: 0, sessionId: "test-session-id", shouldContinue: true };
};
