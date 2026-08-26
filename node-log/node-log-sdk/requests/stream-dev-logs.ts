import {
  onScopeDispose,
  ref,
  shallowRef,
  watch,
  type Ref,
  type ShallowRef,
} from "vue";
import { getBaseUrl } from "@saflib/sdk";
import type { DevLogEntry } from "@saflib/node-log-spec";

export type DevLogsStreamStatus = "connecting" | "live" | "error" | "paused";

export interface UseStreamDevLogsOptions {
  paused?: Ref<boolean>;
  /** Initial snapshot merged before streaming (e.g. from listDevLogs). */
  initialLogs?: ShallowRef<DevLogEntry[]>;
}

function parseSseBuffer(buffer: string): {
  rest: string;
  frames: { event: string; data: string }[];
} {
  const frames: { event: string; data: string }[] = [];
  let start = 0;
  let event = "message";
  let data = "";

  const flush = () => {
    if (data.length > 0) {
      frames.push({
        event,
        data: data.endsWith("\n") ? data.slice(0, -1) : data,
      });
    }
    event = "message";
    data = "";
  };

  while (true) {
    const nl = buffer.indexOf("\n", start);
    if (nl === -1) break;
    let line = buffer.slice(start, nl);
    start = nl + 1;
    if (line.endsWith("\r")) line = line.slice(0, -1);
    if (line === "") {
      flush();
      continue;
    }
    if (line.startsWith(":")) continue;
    const colon = line.indexOf(":");
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? "" : line.slice(colon + 1);
    if (value.startsWith(" ")) value = value.slice(1);
    if (field === "event") event = value;
    else if (field === "data") data += value + "\n";
  }

  return { rest: buffer.slice(start), frames };
}

function mergeEntries(
  current: DevLogEntry[],
  entries: DevLogEntry[],
): DevLogEntry[] {
  if (entries.length === 0) return current;
  const byId = new Map(current.map((e) => [e.id, e]));
  for (const entry of entries) {
    byId.set(entry.id, entry);
  }
  return [...byId.values()].sort((a, b) => a.id - b.id).slice(-1000);
}

/**
 * Tails `GET /dev/logs/stream` via fetch + ReadableStream (SSE).
 * Development-only; surfaces connection status for admin UI.
 */
export function useStreamDevLogs(options: UseStreamDevLogsOptions = {}) {
  const logs = shallowRef<DevLogEntry[]>(options.initialLogs?.value ?? []);
  const status = ref<DevLogsStreamStatus>("connecting");
  const errorMessage = ref("");
  let lastEventId: number | undefined;
  let abort: AbortController | null = null;
  let pending: DevLogEntry[] = [];
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

  const apiBase = getBaseUrl("api");

  function applyEntries(entries: DevLogEntry[]) {
    if (entries.length === 0) return;
    logs.value = mergeEntries(logs.value, entries);
    lastEventId = entries.at(-1)?.id;
  }

  function handleLogData(data: string) {
    try {
      const entry = JSON.parse(data) as DevLogEntry;
      if (options.paused?.value) {
        pending.push(entry);
        return;
      }
      applyEntries([entry]);
    } catch {
      // ignore malformed frames
    }
  }

  function disconnect() {
    if (reconnectTimer != null) {
      clearTimeout(reconnectTimer);
      reconnectTimer = undefined;
    }
    abort?.abort();
    abort = null;
  }

  async function readStream(signal: AbortSignal) {
    const headers: Record<string, string> = { Accept: "text/event-stream" };
    if (lastEventId !== undefined) {
      headers["Last-Event-ID"] = String(lastEventId);
    }
    const res = await fetch(`${apiBase}/dev/logs/stream`, {
      headers,
      signal,
      credentials: "omit",
    });
    if (!res.ok) {
      throw new Error(
        res.status === 403
          ? "Dev logs disabled (DEPLOYMENT_NAME must be development)"
          : `Stream HTTP ${res.status}`,
      );
    }
    if (!options.paused?.value) status.value = "live";
    errorMessage.value = "";

    const reader = res.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parsed = parseSseBuffer(buffer);
      buffer = parsed.rest;
      for (const frame of parsed.frames) {
        if (frame.event === "log") handleLogData(frame.data);
      }
    }
  }

  function scheduleReconnect(connect: () => void) {
    if (abort?.signal.aborted) return;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = undefined;
      connect();
    }, 2000);
  }

  async function connectStream() {
    disconnect();
    const controller = new AbortController();
    abort = controller;
    if (!options.paused?.value) status.value = "connecting";

    try {
      await readStream(controller.signal);
      if (!controller.signal.aborted) {
        status.value = "connecting";
        scheduleReconnect(connectStream);
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      status.value = "error";
      errorMessage.value =
        err instanceof Error ? err.message : "Stream failed";
      scheduleReconnect(connectStream);
    }
  }

  function flushPending() {
    if (pending.length === 0) return;
    applyEntries(pending);
    pending = [];
  }

  watch(
    () => options.paused?.value,
    (paused) => {
      if (paused) {
        status.value = "paused";
      } else {
        flushPending();
        status.value = abort ? "live" : "connecting";
      }
    },
  );

  watch(
    () => options.initialLogs?.value,
    (initial) => {
      if (initial?.length) {
        logs.value = mergeEntries([], initial);
      }
    },
    { immediate: true },
  );

  void connectStream();

  onScopeDispose(() => {
    disconnect();
  });

  return {
    logs,
    status,
    errorMessage,
    reconnect: connectStream,
    clearLocal: () => {
      logs.value = [];
      pending = [];
      lastEventId = undefined;
    },
  };
}
