/**
 * Structured content for `channel: "agent"` log entries backing a tool
 * call — used instead of the plain `---------- LABEL ----------` text so
 * the frontend can pair a `tool_use` with its later `tool_result` (by
 * `id`/`tool_use_id`) into one collapsible card, rather than rendering two
 * unrelated-looking log lines. Other block kinds (text, thinking) keep the
 * plain-text format — see `claude-agent.ts`.
 */
export interface ToolUseLogPayload {
  kind: "tool_use";
  id: string;
  name: string;
  input: unknown;
}

export interface ToolResultLogPayload {
  kind: "tool_result";
  tool_use_id: string;
  content: string;
  is_error: boolean;
}

export type ToolLogPayload = ToolUseLogPayload | ToolResultLogPayload;

/** Parses a log entry's `content` as a `ToolLogPayload`, or returns undefined if it isn't one. */
export function parseToolLogPayload(content: string): ToolLogPayload | undefined {
  if (!content.startsWith("{")) return undefined;
  try {
    const parsed = JSON.parse(content);
    if (parsed?.kind === "tool_use" || parsed?.kind === "tool_result") {
      return parsed as ToolLogPayload;
    }
  } catch {
    // not JSON — a plain-text log entry, which is the common case.
  }
  return undefined;
}
