import {
  createWorkflowAgentTurn,
  createWorkflowAgentTurnRaw,
  getByIdWorkflowRun,
  updateAgentConfigWorkflowRun,
} from "@saflib/new-workflows-db";
import type { WorkflowRunEntity } from "@saflib/new-workflows-db";
import type { AgentConfig, WorkflowContext } from "../types.ts";
import type { AgentAdapter, AgentTurnResult } from "./types.ts";
import { executePromptWithCursor } from "./cursor-agent.ts";
import {
  AgentExitedWithoutResultError,
  AgentResultError,
  CANCELLED_BY_USER_MESSAGE,
  executePromptWithClaude,
} from "./claude-agent.ts";
import { executePromptWithMock } from "./mock-agent.ts";
import { loadRunChain } from "../run-chain.ts";

const ADAPTERS: Record<AgentConfig["cli"], AgentAdapter> = {
  "cursor-agent": executePromptWithCursor,
  "claude-agent": executePromptWithClaude,
  "mock-agent": executePromptWithMock,
};

/**
 * Runs one agent turn in `run` mode. Only called when `ctx.mode === "run"`.
 *
 * Owns agent-session continuity: the *root* run of a `call-workflow` tree
 * holds the session id (`agent_config.sessionId`), every turn anywhere in
 * the tree — each step, TODO retries within a step, nested children,
 * freeform messages — `--resume`s it, and whatever session id the turn
 * reports is saved back to the root. One phase file is one conversation,
 * so the agent doesn't re-read the same files cold on every step.
 *
 * Also records a `workflow_agent_turn` row per CLI invocation (timing,
 * tokens, cost, session) for later auditing. Both db touches are
 * best-effort: without a usable db (step unit tests with a fake `dbKey`)
 * this falls back to `ctx.agentConfig` alone.
 */
export async function runAgentTurn(
  msg: string,
  ctx: WorkflowContext,
): Promise<AgentTurnResult> {
  if (!ctx.agentConfig) {
    throw new Error("agentConfig is required in run mode");
  }
  const cli = ctx.agentConfig.cli;
  const sessionRun = await findSessionRun(ctx);
  const storedSessionId =
    sessionRun?.agent_config?.cli === cli ? sessionRun.agent_config.sessionId : undefined;
  const resumeSessionId = storedSessionId ?? ctx.agentConfig.sessionId;

  let attempt = await invokeAndRecord(msg, ctx, sessionRun, resumeSessionId);
  if (resumeSessionId && isMissingSessionError(attempt.error)) {
    // e.g. the agent CLI's own session store was wiped (a rebuilt
    // container) — the work itself never started, so a fresh session is
    // a safe retry rather than failing the step.
    ctx.log({
      channel: "tool",
      level: "warn",
      content: `Agent session ${resumeSessionId} no longer exists; starting a new one.`,
    });
    attempt = await invokeAndRecord(msg, ctx, sessionRun, undefined);
  }
  if (attempt.error !== undefined) throw attempt.error;

  const result = attempt.result!;
  if (result.sessionId && result.sessionId !== storedSessionId) {
    ctx.agentConfig = { ...ctx.agentConfig, sessionId: result.sessionId };
    if (sessionRun) {
      await bestEffort(() =>
        updateAgentConfigWorkflowRun(ctx.dbKey, {
          id: sessionRun.id,
          agent_config: { ...sessionRun.agent_config, cli, sessionId: result.sessionId },
          now: new Date(),
        }),
      );
    }
  }
  return result;
}

async function invokeAndRecord(
  msg: string,
  ctx: WorkflowContext,
  sessionRun: WorkflowRunEntity | undefined,
  resumeSessionId: string | undefined,
): Promise<{ result?: AgentTurnResult; error?: unknown }> {
  const agentConfig = ctx.agentConfig!;
  ctx.log({
    channel: "tool",
    level: "info",
    content: resumeSessionId
      ? `Resuming agent session ${resumeSessionId}`
      : "Starting a new agent session",
  });

  const turnCtx: WorkflowContext = {
    ...ctx,
    agentConfig: {
      cli: agentConfig.cli,
      ...(resumeSessionId ? { sessionId: resumeSessionId } : {}),
    },
  };
  const startedAt = new Date();
  const raw = createRawOutputBuffer();
  let result: AgentTurnResult | undefined;
  let error: unknown;
  try {
    result = await ADAPTERS[agentConfig.cli](msg, turnCtx, raw.append);
  } catch (e) {
    error = e;
  }
  const finishedAt = new Date();

  if (sessionRun) {
    const metrics = result?.metrics ?? (error instanceof AgentResultError ? error.metrics : {});
    const errorMessage =
      error === undefined ? null : error instanceof Error ? error.message : String(error);
    const turn = await bestEffort(() =>
      createWorkflowAgentTurn(ctx.dbKey, {
        run_id: ctx.runId,
        step_index: ctx.stepIndex,
        session_run_id: sessionRun.id,
        cli: agentConfig.cli,
        model: metrics.model ?? null,
        session_id:
          result?.sessionId ?? (error instanceof AgentResultError ? error.sessionId : undefined) ?? null,
        resumed_session_id: resumeSessionId ?? null,
        status:
          errorMessage === CANCELLED_BY_USER_MESSAGE
            ? "cancelled"
            : errorMessage !== null || metrics.isError
              ? "error"
              : "success",
        error: errorMessage,
        result_subtype: metrics.resultSubtype ?? null,
        prompt_chars: msg.length,
        started_at: startedAt,
        finished_at: finishedAt,
        api_duration_ms: metrics.apiDurationMs ?? null,
        num_turns: metrics.numTurns ?? null,
        input_tokens: metrics.inputTokens ?? null,
        output_tokens: metrics.outputTokens ?? null,
        cache_read_input_tokens: metrics.cacheReadInputTokens ?? null,
        cache_creation_input_tokens: metrics.cacheCreationInputTokens ?? null,
        cost_usd: metrics.costUsd ?? null,
      }),
    );
    const turnId = turn?.result?.id;
    if (turnId) {
      const { output, omittedChars } = raw.read();
      await bestEffort(() =>
        createWorkflowAgentTurnRaw(ctx.dbKey, {
          turn_id: turnId,
          output,
          omitted_chars: omittedChars,
          created_at: finishedAt,
        }),
      );
    }
  }
  return { result, error };
}

/** The root of `ctx.runId`'s `call-workflow` tree, or undefined without a usable db. */
async function findSessionRun(ctx: WorkflowContext): Promise<WorkflowRunEntity | undefined> {
  return bestEffort(async () => {
    const own = await getByIdWorkflowRun(ctx.dbKey, { id: ctx.runId });
    if (own.error) return undefined;
    return (await loadRunChain(ctx.dbKey, own.result))[0];
  });
}

function isMissingSessionError(error: unknown): boolean {
  const pattern = /no conversation found|session .*not found/i;
  // Older CLIs exit with the complaint on stderr; newer ones report it as
  // an `error_during_execution` result.
  if (error instanceof AgentExitedWithoutResultError) return pattern.test(error.stderr);
  if (error instanceof AgentResultError) return error.errors.some((e) => pattern.test(e));
  return false;
}

/** Raw output kept per turn: this much from the start, and this much from the end. */
const RAW_OUTPUT_HEAD_CHARS = 500_000;
const RAW_OUTPUT_TAIL_CHARS = 500_000;

/**
 * Collects a turn's stdout within a fixed budget: the start (session setup,
 * the first events of each kind) and the end (the result, or whatever it
 * was doing when it died) matter most, so the middle is what gets cut.
 */
export function createRawOutputBuffer(
  headChars = RAW_OUTPUT_HEAD_CHARS,
  tailChars = RAW_OUTPUT_TAIL_CHARS,
) {
  let head = "";
  let tail = "";
  let omittedChars = 0;
  return {
    append: (chunk: string) => {
      if (head.length < headChars) {
        const room = headChars - head.length;
        head += chunk.slice(0, room);
        chunk = chunk.slice(room);
      }
      if (!chunk) return;
      tail += chunk;
      if (tail.length > tailChars) {
        omittedChars += tail.length - tailChars;
        tail = tail.slice(tail.length - tailChars);
      }
    },
    read: () => ({
      output: omittedChars
        ? `${head}\n… ${omittedChars} characters omitted …\n${tail}`
        : head + tail,
      omittedChars,
    }),
  };
}

async function bestEffort<T>(fn: () => Promise<T>): Promise<T | undefined> {
  try {
    return await fn();
  } catch {
    return undefined;
  }
}
