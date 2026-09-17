import { spawn } from "node:child_process";
import type { AgentAdapter } from "./types.ts";
import { registerActiveAgentProcess, unregisterActiveAgentProcess } from "./registry.ts";
import { subprocessEnv } from "../subprocess-env.ts";
import type { ToolUseLogPayload, ToolResultLogPayload } from "./tool-log-payload.ts";

/** Kills a whole detached process group (see `spawn(..., {detached: true})` below). No-op if the pid is unknown or already gone. */
export function killProcessGroup(pid: number | undefined, signal: NodeJS.Signals): void {
  if (!pid) return;
  try {
    process.kill(-pid, signal);
  } catch {
    // Already exited, or this platform doesn't support negative-pid group
    // kills — falling back to the single process is still better than
    // throwing out of a "best effort" cancel.
    try {
      process.kill(pid, signal);
    } catch {
      // Already gone.
    }
  }
}

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
 * Same simplification as `cursor-agent.ts`: no cost-file TSV logging, no
 * global time-budget tracking.
 */
export const executePromptWithClaude: AgentAdapter = async (msg, ctx) => {
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

    // `detached: true` makes `agent` the leader of its own process group,
    // so killing the *group* (negative pid) also reaches any Bash tool
    // calls etc. it spawned — killing just the top-level process left
    // those running, and since claude's own signal handling doesn't
    // reliably exit promptly while a child is active, the Stop button
    // could hang waiting for a `close` event that took a long time (or
    // never came).
    const agent = spawn("claude", args, { env: subprocessEnv(), cwd: ctx.cwd, detached: true });
    agent.stdin.end();

    let buffer = "";
    let sessionId = "";
    let resultReceived = false;
    let pipeClosed = false;
    let cancelled = false;

    registerActiveAgentProcess(ctx.runId, {
      kill: () => {
        cancelled = true;
        ctx.log({ channel: "tool", level: "info", content: "Stopping agent…" });
        killProcessGroup(agent.pid, "SIGTERM");
        // Escalate if it's still around after a grace period — some
        // processes ignore SIGTERM outright, or take a while to unwind.
        setTimeout(() => {
          if (!pipeClosed) killProcessGroup(agent.pid, "SIGKILL");
        }, 3000);
      },
    });

    const maybeResolve = () => {
      if (resultReceived && pipeClosed) {
        resolve({ shouldContinue: true, sessionId: sessionId || undefined });
      }
    };

    agent.stdout.on("data", (data: Buffer) => {
      buffer += data.toString();
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
          const content = `---------- RESULT ----------\n${json.is_error ? `Error (${json.subtype})` : "Success"}`;
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
      ctx.log({ channel: "agent", level: "error", content: data.toString() });
    });

    agent.on("error", (err) => {
      unregisterActiveAgentProcess(ctx.runId);
      reject(err);
    });
    agent.on("close", () => {
      unregisterActiveAgentProcess(ctx.runId);
      pipeClosed = true;
      if (cancelled) {
        reject(new Error("Cancelled by user"));
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
