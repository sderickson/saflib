import { spawn } from "node:child_process";
import type { AgentAdapter } from "./types.ts";
import { registerActiveAgentProcess, unregisterActiveAgentProcess } from "./registry.ts";
import { subprocessEnv } from "../subprocess-env.ts";

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

    const agent = spawn("claude", args, { env: subprocessEnv() });
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
        agent.kill("SIGTERM");
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
            const content = `---------- ${label} ----------\n${summarizeContentBlock(block)}`;
            // TODO(debug): remove once we've confirmed the frontend gets a
            // live update per chunk, not just at the end of the turn.
            console.log(`[claude-agent ${ctx.runId}] ${content}`);
            ctx.log({ channel: "agent", level: "info", content });
          }
        } else if (json.type === "result") {
          const content = `---------- RESULT ----------\n${json.is_error ? `Error (${json.subtype})` : "Success"}`;
          console.log(`[claude-agent ${ctx.runId}] ${content}`);
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

function summarizeContentBlock(block: any): string {
  switch (block.type) {
    case "text":
      return block.text ?? "";
    case "tool_use":
      return `Tool: ${block.name}(${JSON.stringify(block.input)})`;
    case "tool_result": {
      const content =
        typeof block.content === "string" ? block.content : JSON.stringify(block.content);
      return block.is_error ? `Tool result (error): ${content}` : `Tool result: ${content}`;
    }
    default:
      return JSON.stringify(block);
  }
}
