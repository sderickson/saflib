import { randomUUID } from "node:crypto";
import type { AgentAdapter } from "./types.ts";

/**
 * Test double: no subprocess, always finishes in one turn. Behaves like a
 * real CLI's sessions — resumes `agentConfig.sessionId` when given one,
 * otherwise reports a brand-new session id — so session carry-over is
 * testable end to end.
 */
export const executePromptWithMock: AgentAdapter = async (msg, ctx, onRawOutput) => {
  ctx.log({ channel: "agent", level: "info", content: msg });
  const sessionId = ctx.agentConfig?.sessionId ?? `mock-session-${randomUUID()}`;
  onRawOutput?.(`${JSON.stringify({ type: "result", session_id: sessionId, prompt: msg })}\n`);
  return { shouldContinue: true, sessionId };
};
