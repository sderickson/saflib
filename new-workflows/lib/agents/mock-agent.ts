import type { AgentAdapter } from "./types.ts";

/** Test double: no subprocess, always finishes in one turn. */
export const executePromptWithMock: AgentAdapter = async (msg, ctx) => {
  ctx.log({ channel: "agent", level: "info", content: msg });
  return { shouldContinue: true, sessionId: "test-session-id" };
};
