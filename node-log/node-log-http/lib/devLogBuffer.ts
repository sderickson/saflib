import TransportStream from "winston-transport";
import type { TransformableInfo } from "logform";

const DEFAULT_CAPACITY = 1000;
const SPLAT = Symbol.for("splat");

export interface DevLogEntry {
  /** Monotonic id for SSE `Last-Event-ID` / `?after=` pagination. */
  id: number;
  timestamp?: string;
  level: string;
  message: string;
  req_id?: string;
  service_name?: string;
  subsystem_name?: string;
  operation_name?: string;
  /**
   * Extra args passed to Winston (e.g. `log.info("msg", { … })`),
   * JSON-serializable snapshot for the DevTools / HTTP viewers.
   */
  meta?: unknown;
}

type DevLogListener = (entry: DevLogEntry) => void;

let nextId = 1;
const buffer: DevLogEntry[] = [];
let capacity = DEFAULT_CAPACITY;
const listeners = new Set<DevLogListener>();
let enabled = false;

const KNOWN_INFO_KEYS = new Set([
  "level",
  "message",
  "timestamp",
  "reqId",
  "req_id",
  "request_id",
  "service_name",
  "subsystem_name",
  "operation_name",
  "user_id",
  "splat",
]);

function jsonSafe(value: unknown): unknown {
  const seen = new WeakSet<object>();
  try {
    return JSON.parse(
      JSON.stringify(value, (_key, v) => {
        if (typeof v === "bigint") return v.toString();
        if (v instanceof Error) {
          return { name: v.name, message: v.message, stack: v.stack };
        }
        if (v && typeof v === "object") {
          if (seen.has(v as object)) return "[Circular]";
          seen.add(v as object);
        }
        return v;
      }),
    );
  } catch {
    return String(value);
  }
}

function extractMeta(info: TransformableInfo): unknown | undefined {
  const splat = (info as Record<symbol, unknown>)[SPLAT];
  if (Array.isArray(splat) && splat.length > 0) {
    return jsonSafe(splat.length === 1 ? splat[0] : splat);
  }

  const rest: Record<string, unknown> = {};
  let found = false;
  for (const key of Object.keys(info)) {
    if (KNOWN_INFO_KEYS.has(key)) continue;
    rest[key] = (info as Record<string, unknown>)[key];
    found = true;
  }
  return found ? jsonSafe(rest) : undefined;
}

function toEntry(info: TransformableInfo): DevLogEntry {
  const message =
    typeof info.message === "string"
      ? info.message
      : info.message == null
        ? ""
        : String(info.message);
  const meta = extractMeta(info);
  return {
    id: nextId++,
    timestamp:
      typeof info.timestamp === "string" ? info.timestamp : undefined,
    level: typeof info.level === "string" ? info.level : "info",
    message,
    req_id:
      typeof info.req_id === "string"
        ? info.req_id
        : typeof info.reqId === "string"
          ? info.reqId
          : typeof info.request_id === "string"
            ? info.request_id
            : undefined,
    service_name:
      typeof info.service_name === "string" ? info.service_name : undefined,
    subsystem_name:
      typeof info.subsystem_name === "string"
        ? info.subsystem_name
        : undefined,
    operation_name:
      typeof info.operation_name === "string"
        ? info.operation_name
        : undefined,
    ...(meta !== undefined ? { meta } : {}),
  };
}

function append(entry: DevLogEntry): void {
  buffer.push(entry);
  while (buffer.length > capacity) {
    buffer.shift();
  }
  for (const listener of listeners) {
    listener(entry);
  }
}

/** Whether the in-memory buffer is capturing logs. */
export function isDevLogBufferEnabled(): boolean {
  return enabled;
}

/**
 * Enable the ring buffer (idempotent). Intended for `DEPLOYMENT_NAME=development`.
 */
export function enableDevLogBuffer(options?: { capacity?: number }): void {
  if (options?.capacity !== undefined) {
    capacity = Math.max(1, options.capacity);
    while (buffer.length > capacity) {
      buffer.shift();
    }
  }
  enabled = true;
}

/**
 * Snapshot of buffered logs. When `afterId` is set, only entries with
 * `id > afterId` are returned (same semantics as SSE Last-Event-ID).
 */
export function getDevLogs(options?: {
  afterId?: number;
  limit?: number;
}): DevLogEntry[] {
  const afterId = options?.afterId;
  let entries =
    afterId === undefined
      ? buffer.slice()
      : buffer.filter((e) => e.id > afterId);
  if (options?.limit !== undefined && options.limit >= 0) {
    entries = entries.slice(-options.limit);
  }
  return entries;
}

/** Subscribe to new log entries. Returns an unsubscribe function. */
export function subscribeDevLogs(listener: DevLogListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Clear buffer and reset ids — for tests only. */
export function resetDevLogBufferForTests(): void {
  buffer.length = 0;
  nextId = 1;
  listeners.clear();
  capacity = DEFAULT_CAPACITY;
  enabled = false;
}

/**
 * Winston transport that appends to the in-memory ring buffer.
 * No-ops until {@link enableDevLogBuffer} has been called.
 */
export class DevLogBufferTransport extends TransportStream {
  log(info: TransformableInfo, callback: () => void): void {
    setImmediate(() => {
      this.emit("logged", info);
    });
    if (enabled) {
      append(toEntry(info));
    }
    callback();
  }
}

export function createDevLogBufferTransport(): DevLogBufferTransport {
  return new DevLogBufferTransport({ level: "info" });
}
