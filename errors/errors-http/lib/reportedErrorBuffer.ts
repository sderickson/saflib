const DEFAULT_CAPACITY = 1000;

export type ReportedErrorKind = "csp-violation" | "client" | "server" | "test";

export interface ReportedErrorInput {
  kind: ReportedErrorKind;
  message: string;
  stack?: string;
  metadata?: Record<string, unknown>;
  source: string;
}

export interface ReportedErrorRecord {
  id: number;
  kind: ReportedErrorKind;
  message: string;
  stack?: string;
  metadata: Record<string, unknown>;
  source: string;
  timestamp: string;
}

let nextId = 1;
const buffer: ReportedErrorRecord[] = [];
let capacity = DEFAULT_CAPACITY;

function jsonSafe(value: unknown): Record<string, unknown> {
  try {
    const parsed = JSON.parse(JSON.stringify(value ?? {}));
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return { value: parsed };
  } catch {
    return { value: String(value) };
  }
}

/**
 * Append a reported error to the in-memory ring buffer.
 * Used by HTTP handlers and server-side error collectors.
 */
export function recordReportedError(
  input: ReportedErrorInput,
): ReportedErrorRecord {
  const record: ReportedErrorRecord = {
    id: nextId++,
    kind: input.kind,
    message: input.message,
    stack: input.stack,
    metadata: jsonSafe(input.metadata ?? {}),
    source: input.source,
    timestamp: new Date().toISOString(),
  };
  buffer.push(record);
  while (buffer.length > capacity) {
    buffer.shift();
  }
  return record;
}

/** Snapshot of buffered reported errors. */
export function listReportedErrors(options?: {
  kind?: ReportedErrorKind;
  source?: string;
  limit?: number;
}): ReportedErrorRecord[] {
  let entries = buffer.slice();
  if (options?.kind) {
    entries = entries.filter((entry) => entry.kind === options.kind);
  }
  if (options?.source) {
    const query = options.source.toLowerCase();
    entries = entries.filter((entry) =>
      entry.source.toLowerCase().includes(query),
    );
  }
  if (options?.limit !== undefined && options.limit >= 0) {
    entries = entries.slice(-options.limit);
  }
  return entries;
}

/** Clear buffer and reset ids — for tests only. */
export function resetReportedErrorBufferForTests(): void {
  buffer.length = 0;
  nextId = 1;
  capacity = DEFAULT_CAPACITY;
}

/** Override ring buffer capacity — for tests only. */
export function setReportedErrorBufferCapacityForTests(
  nextCapacity: number,
): void {
  capacity = Math.max(1, nextCapacity);
  while (buffer.length > capacity) {
    buffer.shift();
  }
}
