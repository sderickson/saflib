import { spawn } from "node:child_process";
import type { AgentAdapter, AgentTurnMetrics } from "./types.ts";
import { trackAgentProcess } from "./registry.ts";
import { subprocessEnv } from "../subprocess-env.ts";
import type { ToolUseLogPayload, ToolResultLogPayload } from "./tool-log-payload.ts";

/**
 * The exact step-failure message a user-initiated Stop produces — exported
 * so callers that need to tell "the user stopped this" apart from a
 * genuine step failure (e.g. the HTTP layer's `was_cancelled` on
 * `WorkflowRun`, see `map-run.ts`) can check for it without duplicating
 * the string.
 */
export const CANCELLED_BY_USER_MESSAGE = "Cancelled by user";

/**
 * Drives the Claude Code CLI headlessly, same shape as `cursor-agent.ts`'s
 * adapter (NDJSON parsing, pushed onto `ctx.log` instead of printed).
 *
 * Claude Code's `stream-json` events follow the Messages API shape rather
 * than cursor-agent's custom one: `assistant`/`user` messages carry a
 * `content` block array (`text`, `tool_use`, `tool_result`), not a
 * separate top-level `tool_call` event type.
 *
 * `--dangerously-skip-permissions` matches `cursor-agent`'s own `-f`
 * (force) flag in this same file — both exist so an unattended workflow
 * run doesn't stall on a permission prompt no one is present to answer.
 *
 * Cost/usage from the final `result` event comes back as `metrics` for
 * `runAgentTurn` to persist (no cost-file TSV logging, no global
 * time-budget tracking here).
 */
export const executePromptWithClaude: AgentAdapter = async (msg, ctx, onRawOutput) => {
  return new Promise((resolve, reject) => {
    const args = [
      "-p",
      msg,
      "--output-format",
      "stream-json",
      "--verbose",
      "--dangerously-skip-permissions",
    ];
    if (ctx.agentConfig?.sessionId) {
      args.push("--resume", ctx.agentConfig.sessionId);
    }

    // Detached so Stop can kill the whole process group — see `trackAgentProcess`.
    const agent = spawn("claude", args, { env: subprocessEnv(), cwd: ctx.cwd, detached: true });
    agent.stdin.end();

    let buffer = "";
    let sessionId = "";
    let model: string | undefined;
    let metrics: AgentTurnMetrics | undefined;
    let stderr = "";
    let resultReceived = false;
    let resultError: AgentResultError | undefined;
    let pipeClosed = false;
    const { wasCancelled } = trackAgentProcess(ctx.runId, agent, () =>
      ctx.log({ channel: "tool", level: "info", content: "Stopping agent…" }),
    );

    const maybeResolve = () => {
      if (resultReceived && pipeClosed) {
        if (resultError) {
          reject(resultError);
          return;
        }
        resolve({
          shouldContinue: true,
          sessionId: sessionId || undefined,
          metrics: metrics ? { ...metrics, model } : model ? { model } : undefined,
        });
      }
    };

    agent.stdout.on("data", (data: Buffer) => {
      const chunk = data.toString();
      onRawOutput?.(chunk);
      buffer += chunk;
      while (buffer.includes("\n")) {
        const line = buffer.split("\n")[0];
        buffer = buffer.slice(line.length + 1);
        if (!line.trim()) continue;
        let json: any;
        try {
          json = JSON.parse(line);
        } catch {
          continue;
        }

        if (json.session_id) {
          sessionId = json.session_id;
        }
        if (json.type === "system" && json.subtype === "init" && json.model) {
          model = json.model;
        }

        if (json.type === "assistant" || json.type === "user") {
          const label = json.type === "assistant" ? "AGENT" : "TOOL";
          for (const block of json.message?.content ?? []) {
            // `tool_use`/`tool_result` get a structured JSON payload
            // instead of the plain `---------- LABEL ----------` text —
            // the frontend pairs them by `id`/`tool_use_id` into one
            // collapsible card (the command + its own output), rather
            // than two unrelated-looking log lines.
            let content: string;
            if (block.type === "tool_use") {
              content = JSON.stringify({
                kind: "tool_use",
                id: block.id,
                name: block.name,
                input: block.input,
              } satisfies ToolUseLogPayload);
            } else if (block.type === "tool_result") {
              content = JSON.stringify({
                kind: "tool_result",
                tool_use_id: block.tool_use_id,
                content:
                  typeof block.content === "string"
                    ? block.content
                    : JSON.stringify(block.content),
                is_error: Boolean(block.is_error),
              } satisfies ToolResultLogPayload);
            } else {
              content = `---------- ${label} ----------\n${summarizeContentBlock(block)}`;
            }
            ctx.log({
              channel: "agent",
              level: block.type === "tool_result" && block.is_error ? "error" : "info",
              content,
            });
          }
        } else if (json.type === "result") {
          metrics = parseResultMetrics(json);
          const errors = resultErrors(json);
          if (json.is_error) {
            resultError = new AgentResultError(json.subtype, errors, { ...metrics, model }, sessionId || undefined);
          }
          const content =
            `---------- RESULT ----------\n${json.is_error ? `Error (${json.subtype})` : "Success"}${formatResultSummary(metrics)}` +
            (errors.length ? `\n${errors.join("\n")}` : "");
          ctx.log({
            channel: "agent",
            level: json.is_error ? "error" : "info",
            content,
          });
          resultReceived = true;
          maybeResolve();
        }
      }
    });

    agent.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
      ctx.log({ channel: "agent", level: "error", content: data.toString() });
    });

    agent.on("error", reject);
    agent.on("close", (code) => {
      pipeClosed = true;
      if (wasCancelled()) {
        reject(new Error(CANCELLED_BY_USER_MESSAGE));
        return;
      }
      if (!resultReceived) {
        // Exited without a `result` event — e.g. `--resume` of a session
        // that no longer exists, or a crash. Without this the promise
        // never settled and the step hung forever.
        reject(new AgentExitedWithoutResultError(code, stderr));
        return;
      }
      maybeResolve();
    });
  });
};

/** Summarizes block kinds that stay plain text (everything but tool_use/tool_result — see `ToolLogPayload`). */
export function summarizeContentBlock(block: any): string {
  switch (block.type) {
    case "text":
      return block.text ?? "";
    case "thinking":
      // Extended-thinking blocks carry a `signature` (an opaque,
      // multi-KB base64 blob for verifying the block came from the
      // model) alongside the human-readable `thinking` text, which is
      // often empty for a redacted/summarized turn. Falling through to
      // the default JSON.stringify dumped that whole signature into the
      // log — unreadable, and by far the largest single log entries.
      return block.thinking?.trim() ? block.thinking : "(thinking…)";
    default:
      return JSON.stringify(block);
  }
}

/** The CLI process exited before emitting its final `result` event. */
export class AgentExitedWithoutResultError extends Error {
  readonly exitCode: number | null;
  readonly stderr: string;

  constructor(exitCode: number | null, stderr: string) {
    super(
      `Agent exited (code ${exitCode ?? "unknown"}) without a result${stderr.trim() ? `: ${stderr.trim()}` : ""}`,
    );
    this.name = "AgentExitedWithoutResultError";
    this.exitCode = exitCode;
    this.stderr = stderr;
  }
}

/**
 * The CLI finished with an error `result` (e.g. `error_during_execution`
 * when `--resume` names a session it doesn't have, or `error_max_turns`).
 * The turn didn't do its job, so the step mustn't count it as a success.
 */
export class AgentResultError extends Error {
  readonly subtype: string | undefined;
  readonly errors: string[];
  readonly metrics: AgentTurnMetrics;
  readonly sessionId: string | undefined;

  constructor(subtype: unknown, errors: string[], metrics: AgentTurnMetrics, sessionId: string | undefined) {
    const kind = typeof subtype === "string" ? subtype : "error";
    super(`Agent turn failed (${kind})${errors.length ? `: ${errors.join("; ")}` : ""}`);
    this.name = "AgentResultError";
    this.subtype = typeof subtype === "string" ? subtype : undefined;
    this.errors = errors;
    this.metrics = metrics;
    this.sessionId = sessionId;
  }
}

function resultErrors(json: any): string[] {
  return Array.isArray(json.errors) ? json.errors.filter((e: unknown) => typeof e === "string") : [];
}

function numberOrUndefined(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/** Pulls cost/usage out of Claude Code's final `result` stream-json event. */
export function parseResultMetrics(json: any): AgentTurnMetrics {
  const usage = json.usage ?? {};
  return {
    resultSubtype: typeof json.subtype === "string" ? json.subtype : undefined,
    isError: Boolean(json.is_error),
    apiDurationMs: numberOrUndefined(json.duration_api_ms),
    numTurns: numberOrUndefined(json.num_turns),
    inputTokens: numberOrUndefined(usage.input_tokens),
    outputTokens: numberOrUndefined(usage.output_tokens),
    cacheReadInputTokens: numberOrUndefined(usage.cache_read_input_tokens),
    cacheCreationInputTokens: numberOrUndefined(usage.cache_creation_input_tokens),
    costUsd: numberOrUndefined(json.total_cost_usd),
  };
}

/** e.g. ` · 12 turns · 84s API · $0.4213` — appended to the RESULT log line. */
export function formatResultSummary(metrics: AgentTurnMetrics): string {
  const parts: string[] = [];
  if (metrics.numTurns !== undefined) parts.push(`${metrics.numTurns} turns`);
  if (metrics.apiDurationMs !== undefined) {
    parts.push(`${Math.round(metrics.apiDurationMs / 1000)}s API`);
  }
  if (metrics.costUsd !== undefined) parts.push(`$${metrics.costUsd.toFixed(4)}`);
  return parts.length ? ` · ${parts.join(" · ")}` : "";
}
