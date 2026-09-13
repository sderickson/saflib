import type { WorkflowContext } from "../types.ts";
import type { AgentTurnResult } from "./types.ts";
import { executePromptWithCursor } from "./cursor-agent.ts";
import { executePromptWithMock } from "./mock-agent.ts";

/** Runs one agent turn in `run` mode. Only called when `ctx.mode === "run"`. */
export async function runAgentTurn(
  msg: string,
  ctx: WorkflowContext,
): Promise<AgentTurnResult> {
  if (!ctx.agentConfig) {
    throw new Error("agentConfig is required in run mode");
  }
  switch (ctx.agentConfig.cli) {
    case "cursor-agent":
      return executePromptWithCursor(msg, ctx);
    case "mock-agent":
      return executePromptWithMock(msg, ctx);
  }
}
