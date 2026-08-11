import TransportStream from "winston-transport";
import type { TransformableInfo } from "logform";

const DEFAULT_CAPACITY = 1000;

export interface DevLogEntry {
  /** Monotonic id for SSE `Last-Event-ID` / `?after=` pagination. */
  id: number;
  timestamp?: string;
  level: string;
  message: string;
  reqId?: string;
  service_name?: string;
  subsystem_name?: string;
  operation_name?: string;
}

type DevLogListener = (entry: DevLogEntry) => void;

let nextId = 1;
const buffer: DevLogEntry[] = [];
let capacity = DEFAULT_CAPACITY;
const listeners = new Set<DevLogListener>();
let enabled = false;

function toEntry(info: TransformableInfo): DevLogEntry {
  const message =
    typeof info.message === "string"
      ? info.message
      : info.message == null
        ? ""
        : String(info.message);
  return {
    id: nextId++,
    timestamp:
      typeof info.timestamp === "string" ? info.timestamp : undefined,
    level: typeof info.level === "string" ? info.level : "info",
    message,
    reqId:
      typeof info.reqId === "string"
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
