import { print } from "./utils.ts";
import { type PromptParam, type PromptResult } from "./types.ts";
import { executePromptWithCursor } from "./agents/cursor-agent.ts";
import { executePromptWithMock } from "./agents/mock-agent.ts";

export const handlePrompt = async ({
  msg,
  context,
}: PromptParam): Promise<PromptResult> => {
  if (process.env.NODE_ENV === "test") {
    return { code: 0, sessionId: "test-session-id", shouldContinue: false };
  }
  switch (context.runMode) {
    case "run":
      switch (context.agentConfig?.cli) {
        case "cursor-agent":
          return await executePromptWithCursor({ msg, context });
        case "mock-agent":
          return await executePromptWithMock({ msg, context });
        case undefined:
          throw new Error("Agent config is required for run mode");
      }
    case "dry":
      return { code: 0, sessionId: undefined, shouldContinue: true };
    case "script":
      // mainly to see errors when running scripts
      console.log(msg);
      return { code: 0, sessionId: undefined, shouldContinue: false };
    case "print":
      printPrompt({ msg, context });
      return { code: 0, sessionId: undefined, shouldContinue: false };
    default:
      throw context.runMode satisfies never;
  }
};

export const printPrompt = ({ msg, context }: PromptParam) => {
  if (process.env.NODE_ENV === "test") {
    return;
  }
  print("");
  if (context.prompt) {
    print(context.prompt);
    print("");
  }
  print(msg);
  print("");
  return;
};
