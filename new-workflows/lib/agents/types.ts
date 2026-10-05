import type { WorkflowContext } from "../types.ts";

export interface AgentTurnResult {
  /** False when the agent's own subprocess signals it needs another turn. */
  shouldContinue: boolean;
  sessionId?: string;
}

export type AgentAdapter = (
  msg: string,
  ctx: WorkflowContext,
) => Promise<AgentTurnResult>;
