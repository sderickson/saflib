import { parseToolLogPayload } from "@saflib/new-workflows";
import type { WorkflowLogEntry } from "@saflib/new-workflows-spec";

export interface ToolCallGroup {
  type: "tool-call";
  id: string;
  name: string;
  input: unknown;
  useLog: WorkflowLogEntry;
  resultLog?: WorkflowLogEntry;
}

export interface SingleLogItem {
  type: "single";
  log: WorkflowLogEntry;
}

export type LogItem = ToolCallGroup | SingleLogItem;

/**
 * Pairs a `tool_use` log entry with its later `tool_result` (by id), so the
 * UI can render one collapsible card — the command plus its own output —
 * instead of two log lines that don't visually read as related. A
 * `tool_result` with no matching (already-seen) `tool_use` falls back to
 * standalone rendering; this shouldn't normally happen since the model
 * always emits the call before its result.
 */
export function groupLogs(logs: WorkflowLogEntry[]): LogItem[] {
  const items: LogItem[] = [];
  const groupIndexById = new Map<string, number>();

  for (const log of logs) {
    const payload = parseToolLogPayload(log.content);

    if (payload?.kind === "tool_use") {
      items.push({
        type: "tool-call",
        id: payload.id,
        name: payload.name,
        input: payload.input,
        useLog: log,
      });
      groupIndexById.set(payload.id, items.length - 1);
      continue;
    }

    if (payload?.kind === "tool_result") {
      const idx = groupIndexById.get(payload.tool_use_id);
      const existing = idx !== undefined ? items[idx] : undefined;
      if (existing?.type === "tool-call") {
        existing.resultLog = log;
        continue;
      }
    }

    items.push({ type: "single", log });
  }

  return items;
}
