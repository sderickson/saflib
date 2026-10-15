import { randomUUID } from "node:crypto";
import type { AgentAdapter } from "./types.ts";

/**
 * Test double: no subprocess, always finishes in one turn. Behaves like a
 * real CLI's sessions — resumes `agentConfig.sessionId` when given one,
 * otherwise reports a brand-new session id — so session carry-over is
 * testable end to end.
 */
export const executePromptWithMock: AgentAdapter = async (msg, ctx) => {
  ctx.log({ channel: "agent", level: "info", content: msg });
  return {
    shouldContinue: true,
    sessionId: ctx.agentConfig?.sessionId ?? `mock-session-${randomUUID()}`,
  };
};
