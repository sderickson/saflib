const DEFAULT_CAPACITY = 1000;

export type ProductEventSource = "client" | "server";

export interface ProductEventRecord {
  id: number;
  name: string;
  payload: Record<string, unknown>;
  source: ProductEventSource;
  timestamp: string;
}

let nextId = 1;
const buffer: ProductEventRecord[] = [];
let capacity = DEFAULT_CAPACITY;

function jsonSafe(value: unknown): Record<string, unknown> {
  try {
    const parsed = JSON.parse(JSON.stringify(value));
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return { value: parsed };
  } catch {
    return { value: String(value) };
  }
}

function eventName(productEvent: Record<string, unknown>): string {
  return typeof productEvent.event === "string" ? productEvent.event : "unknown";
}

/**
 * Append a product event to the in-memory ring buffer.
 * Used by HTTP handlers (client source) and server-side emitters.
 */
export function recordProductEvent(
  productEvent: Record<string, unknown>,
  source: ProductEventSource,
): ProductEventRecord {
  const record: ProductEventRecord = {
    id: nextId++,
    name: eventName(productEvent),
    payload: jsonSafe(productEvent),
    source,
    timestamp: new Date().toISOString(),
  };
  buffer.push(record);
  while (buffer.length > capacity) {
    buffer.shift();
  }
  return record;
}

/** Snapshot of buffered product events. */
export function listProductEvents(options?: {
  name?: string;
  limit?: number;
}): ProductEventRecord[] {
  let entries = buffer.slice();
  if (options?.name) {
    entries = entries.filter((entry) => entry.name === options.name);
  }
  if (options?.limit !== undefined && options.limit >= 0) {
    entries = entries.slice(-options.limit);
  }
  return entries;
}

/** Clear buffer and reset ids — for tests only. */
export function resetProductEventBufferForTests(): void {
  buffer.length = 0;
  nextId = 1;
  capacity = DEFAULT_CAPACITY;
}

/** Override ring buffer capacity — for tests only. */
export function setProductEventBufferCapacityForTests(nextCapacity: number): void {
  capacity = Math.max(1, nextCapacity);
  while (buffer.length > capacity) {
    buffer.shift();
  }
}
