import { spawn } from "node:child_process";
import type { AgentAdapter } from "./types.ts";
import { AgentExitedWithoutResultError } from "./claude-agent.ts";
import { subprocessEnv } from "../subprocess-env.ts";
import type { ToolResultLogPayload, ToolUseLogPayload } from "./tool-log-payload.ts";

/**
 * Mechanical port of the old `cursor-agent.ts` adapter's NDJSON parsing and
 * per-tool-call summaries — pushed onto `ctx.log` (channel `agent`) instead
 * of printed directly (`printLineSlowly`), since lib never prints.
 *
 * Simplifications vs. the old adapter (both backlog territory, not needed to
 * prove the engine out): no cost-file TSV logging, and no global time-budget
 * tracking — `agentConfig`'s per-run fields are the place for that later.
 */
export const executePromptWithCursor: AgentAdapter = async (msg, ctx, onRawOutput) => {
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
    let stderr = "";
    let resultReceived = false;
    let pipeClosed = false;
    let shouldContinue = true;
    const toolCalls = createCursorToolCallTracker();

    const maybeResolve = () => {
      if (resultReceived && pipeClosed) {
        resolve({ shouldContinue, sessionId: sessionId || undefined });
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

        if (json.type === "system") {
          sessionId = json.session_id;
        } else if (json.type === "assistant") {
          // `user` events are cursor echoing the prompt back, which the
          // step already logged as its `agent-input` row.
          for (const content of json.message?.content ?? []) {
            ctx.log({
              channel: "agent",
              level: "info",
              content: `---------- AGENT ----------\n${content.text}`,
            });
          }
        } else if (json.type === "tool_call") {
          const payload = toolCalls.toPayload(json);
          if (payload) {
            ctx.log({
              channel: "agent",
              level: payload.kind === "tool_result" && payload.is_error ? "error" : "info",
              content: JSON.stringify(payload),
            });
          }
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
      stderr += data.toString();
      ctx.log({ channel: "agent", level: "error", content: data.toString() });
    });

    agent.on("error", reject);
    agent.on("close", (code) => {
      pipeClosed = true;
      if (!resultReceived) {
        reject(new AgentExitedWithoutResultError(code, stderr));
        return;
      }
      maybeResolve();
    });
  });
};

/** Output kept per tool result; a cat of a huge file shouldn't bloat the log table. */
const MAX_RESULT_CHARS = 20_000;

/**
 * Turns cursor's `tool_call` events into the same `tool_use`/`tool_result`
 * payloads the claude adapter logs, under claude's tool names (`Bash`,
 * `Read`, `Edit`, …). The dev site then shows one card per call for either
 * CLI, and run-log queries (`json_extract(content, '$.name') = 'Read'`)
 * work for both.
 *
 * Cursor sends a `started` and a `completed` event per call, paired by
 * `call_id`. Without a `call_id`, a completion pairs with the oldest open
 * call of the same tool.
 */
export function createCursorToolCallTracker() {
  const open = new Map<string, string[]>();
  let counter = 0;

  return {
    toPayload(json: any): ToolUseLogPayload | ToolResultLogPayload | undefined {
      const call = json.tool_call ?? {};
      const key = Object.keys(call)[0];
      if (!key) return undefined;
      const body = call[key] ?? {};
      const queue = open.get(key) ?? [];
      open.set(key, queue);

      if (json.subtype === "started") {
        const id = typeof json.call_id === "string" ? json.call_id : `cursor-${++counter}`;
        queue.push(id);
        return { kind: "tool_use", id, ...describeCursorTool(key, body.args ?? {}) };
      }
      if (json.subtype === "completed") {
        const id =
          typeof json.call_id === "string"
            ? json.call_id
            : (queue[0] ?? `cursor-${++counter}`);
        const at = queue.indexOf(id);
        if (at >= 0) queue.splice(at, 1);
        return { kind: "tool_result", tool_use_id: id, ...describeCursorResult(key, body.result) };
      }
      return undefined;
    },
  };
}

/** Claude's name and input shape for a cursor tool call. */
export function describeCursorTool(key: string, args: any): { name: string; input: unknown } {
  switch (key) {
    case "readToolCall":
      return { name: "Read", input: { file_path: args.path } };
    case "editToolCall":
      return { name: "Edit", input: { file_path: args.path } };
    case "writeToolCall":
      return { name: "Write", input: { file_path: args.path } };
    case "deleteToolCall":
      return { name: "Delete", input: { file_path: args.path } };
    case "shellToolCall":
      return { name: "Bash", input: { command: args.command } };
    case "grepToolCall":
      return { name: "Grep", input: { pattern: args.pattern, path: args.path } };
    case "globToolCall":
      return {
        name: "Glob",
        input: { pattern: args.globPattern, path: args.targetDirectory },
      };
    case "lsToolCall":
      return { name: "LS", input: { path: args.path } };
    case "updateTodosToolCall":
      return { name: "TodoWrite", input: { todos: args.todos ?? [] } };
    default:
      return { name: key.replace(/ToolCall$/, ""), input: args };
  }
}

/** Cursor results are `{ success: … }` or `{ failure: … }`, shaped per tool. */
export function describeCursorResult(
  key: string,
  result: any,
): { content: string; is_error: boolean } {
  const failure = result?.failure ?? result?.error;
  if (failure !== undefined) {
    return { content: clip(resultText(key, failure)), is_error: true };
  }
  return { content: clip(resultText(key, result?.success ?? result)), is_error: false };
}

function resultText(key: string, value: any): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  if (key === "shellToolCall") {
    const parts = [value.stdout, value.stderr].filter(
      (p): p is string => typeof p === "string" && p.length > 0,
    );
    const exit =
      typeof value.exitCode === "number" && value.exitCode !== 0 ? `exit code ${value.exitCode}` : "";
    return [...parts, exit].filter(Boolean).join("\n");
  }
  if (key === "readToolCall" && typeof value.content === "string") return value.content;
  if (key === "globToolCall" && Array.isArray(value.files)) return value.files.join("\n");
  if (key === "editToolCall" && typeof value.diffString === "string") return value.diffString;
  if (typeof value.message === "string") return value.message;
  return JSON.stringify(value, null, 2);
}

function clip(text: string): string {
  return text.length > MAX_RESULT_CHARS
    ? `${text.slice(0, MAX_RESULT_CHARS)}\n… (${text.length - MAX_RESULT_CHARS} more characters)`
    : text;
}
