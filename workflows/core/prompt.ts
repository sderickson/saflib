import { print } from "./utils.ts";
import { type PromptParam, type PromptResult } from "./types.ts";
import { executePrompt } from "./agents/cursor-agent.ts";

export const handlePrompt = async ({
  msg,
  context,
}: PromptParam): Promise<PromptResult> => {
  if (process.env.NODE_ENV === "test") {
    return { code: 0, sessionId: "test-session-id", shouldContinue: false };
  }
  switch (context.runMode) {
    case "run":
      return await executePrompt({ msg, context });
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
  if (context.systemPrompt) {
    print(context.systemPrompt);
    print("");
  }
  print(msg);
  print("");
  return;
};
