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

export interface ChannelGroup {
  type: "channel-group";
  id: string;
  channel: string;
  logs: WorkflowLogEntry[];
}

export type LogItem = ToolCallGroup | SingleLogItem | ChannelGroup;

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

  return mergeConsecutiveChannels(items);
}

/**
 * Channels whose consecutive entries are narration about *the same
 * ongoing action* rather than distinct, individually-meaningful things —
 * safe (and an improvement) to collapse into one card. `agent-input` is
 * deliberately excluded: each entry there is its own instruction to the
 * agent, and `isLastAgentInput`'s "pin the latest instruction" behavior
 * needs the *specific* last one addressable on its own, not folded into a
 * group with earlier ones. `agent` text/tool-call entries already get
 * their own structured handling above.
 */
const MERGEABLE_CHANNELS = new Set(["tool", "terminal"]);

/**
 * Collapses runs of 2+ consecutive `single` items sharing a (mergeable —
 * see `MERGEABLE_CHANNELS`) channel, e.g. a step's own `[tool]` narration
 * — "Running command: …", "Successfully ran `…`", "Committed: …" — into
 * one `channel-group`, so they render as one card instead of one each. A
 * lone entry (no same-channel neighbor) stays a plain `single` — grouping
 * a single item would just add a pointless wrapper. Runs are only ever
 * adjacent in the already-ordered `items` list, so this is a single
 * linear pass, not a re-sort.
 */
function mergeConsecutiveChannels(items: LogItem[]): LogItem[] {
  const merged: LogItem[] = [];
  let run: WorkflowLogEntry[] = [];

  const flush = () => {
    if (run.length === 0) return;
    if (run.length === 1) {
      merged.push({ type: "single", log: run[0]! });
    } else {
      merged.push({
        type: "channel-group",
        id: `group-${run[0]!.id}`,
        channel: run[0]!.channel,
        logs: run,
      });
    }
    run = [];
  };

  const isMergeable = (log: WorkflowLogEntry) => MERGEABLE_CHANNELS.has(log.channel);

  for (const item of items) {
    const mergeable = item.type === "single" && isMergeable(item.log);
    if (mergeable && run.length > 0 && run[0]!.channel === item.log.channel) {
      run.push(item.log);
      continue;
    }
    flush();
    if (mergeable) {
      run.push((item as SingleLogItem).log);
    } else {
      merged.push(item);
    }
  }
  flush();

  return merged;
}
