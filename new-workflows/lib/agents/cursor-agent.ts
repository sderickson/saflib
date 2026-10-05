import { spawn } from "node:child_process";
import type { AgentAdapter } from "./types.ts";
import { subprocessEnv } from "../subprocess-env.ts";

/**
 * Mechanical port of the old `cursor-agent.ts` adapter's NDJSON parsing and
 * per-tool-call summaries — pushed onto `ctx.log` (channel `agent`) instead
 * of printed directly (`printLineSlowly`), since lib never prints.
 *
 * Simplifications vs. the old adapter (both backlog territory, not needed to
 * prove the engine out): no cost-file TSV logging, and no global time-budget
 * tracking — `agentConfig`'s per-run fields are the place for that later.
 */
export const executePromptWithCursor: AgentAdapter = async (msg, ctx) => {
  return new Promise((resolve, reject) => {
    const args = ["-p", msg, "--output-format", "stream-json", "-f"];
    if (ctx.agentConfig?.sessionId) {
      args.push("--resume", ctx.agentConfig.sessionId);
    } else {
      args.push("--model", "auto");
    }

    const agent = spawn("cursor-agent", args, { env: subprocessEnv(), cwd: ctx.cwd });
    agent.stdin.end();

    let buffer = "";
    let sessionId = "";
    let resultReceived = false;
    let pipeClosed = false;
    let shouldContinue = true;

    const maybeResolve = () => {
      if (resultReceived && pipeClosed) {
        resolve({ shouldContinue, sessionId: sessionId || undefined });
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

        if (json.type === "system") {
          sessionId = json.session_id;
        } else if (json.type === "assistant" || json.type === "user") {
          const label = json.type === "assistant" ? "AGENT" : "PROMPT";
          for (const content of json.message?.content ?? []) {
            ctx.log({
              channel: "agent",
              level: "info",
              content: `---------- ${label} ----------\n${content.text}`,
            });
          }
        } else if (json.type === "tool_call") {
          ctx.log({
            channel: "agent",
            level: "info",
            content: summarizeToolCall(json),
          });
        } else if (json.type === "result") {
          ctx.log({
            channel: "agent",
            level: json.is_error ? "error" : "info",
            content: `---------- RESULT ----------\n${json.is_error ? "Error" : "Success"}`,
          });
          resultReceived = true;
          maybeResolve();
        }
      }
    });

    agent.stderr.on("data", (data: Buffer) => {
      ctx.log({ channel: "agent", level: "error", content: data.toString() });
    });

    agent.on("error", reject);
    agent.on("close", () => {
      pipeClosed = true;
      maybeResolve();
    });
  });
};

function summarizeToolCall(json: any): string {
  const call = json.tool_call ?? {};
  const started = json.subtype === "started";
  if (call.readToolCall) {
    return started
      ? `Reading file: ${call.readToolCall.args?.path ?? "unknown"}`
      : `File read: ${call.readToolCall.args?.path ?? "unknown"}`;
  }
  if (call.editToolCall) {
    return started
      ? `Writing file: ${call.editToolCall.args?.path ?? "unknown"}`
      : `File written: ${call.editToolCall.args?.path ?? "unknown"}`;
  }
  if (call.shellToolCall) {
    return started
      ? `Running command: ${call.shellToolCall.args?.command ?? "unknown"}`
      : call.shellToolCall.result?.success
        ? "Command successful"
        : `Command failed: ${call.shellToolCall.result?.failure?.stderr ?? ""}`;
  }
  if (call.globToolCall) {
    return started
      ? `Globbing files: ${call.globToolCall.args?.globPattern ?? ""}`
      : `Files globbed: ${call.globToolCall.result?.success?.totalFiles ?? 0}`;
  }
  if (call.grepToolCall) {
    return `Grepping: ${call.grepToolCall.args?.pattern ?? ""}`;
  }
  if (call.lsToolCall) {
    return `Listing files: ${call.lsToolCall.args?.path ?? ""}`;
  }
  if (call.updateTodosToolCall) {
    const todos = (call.updateTodosToolCall.args?.todos ?? []).map(
      (t: { content: string }) => t.content,
    );
    return `Todos: ${todos.join(", ")}`;
  }
  return `Tool call: ${Object.keys(call).join(", ") || "unknown"}`;
}
