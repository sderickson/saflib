import type { WorkflowContext } from "../types.ts";

/**
 * What the agent CLI reported about one invocation. Every field is
 * optional — adapters fill in what their CLI exposes (Claude Code's
 * `result` event has all of it; cursor-agent has little). Persisted as a
 * `workflow_agent_turn` row by `runAgentTurn`.
 */
export interface AgentTurnMetrics {
  model?: string;
  /** e.g. `success`, `error_max_turns`, `error_during_execution`. */
  resultSubtype?: string;
  isError?: boolean;
  apiDurationMs?: number;
  numTurns?: number;
  inputTokens?: number;
  outputTokens?: number;
  cacheReadInputTokens?: number;
  cacheCreationInputTokens?: number;
  costUsd?: number;
}

export interface AgentTurnResult {
  /** False when the agent's own subprocess signals it needs another turn. */
  shouldContinue: boolean;
  sessionId?: string;
  metrics?: AgentTurnMetrics;
}

export type AgentAdapter = (
  msg: string,
  ctx: WorkflowContext,
  /** Receives the CLI's stdout verbatim, chunk by chunk (see `workflow_agent_turn_raw`). */
  onRawOutput?: (chunk: string) => void,
) => Promise<AgentTurnResult>;
