import { SSE_HEARTBEAT_INTERVAL_MS, SSE_MAX_CONNECTION_MS } from "./constants.ts";

export { SSE_HEARTBEAT_INTERVAL_MS, SSE_MAX_CONNECTION_MS };

/** Minimal writable surface (Express `Response`, Node streams, test buffers). */
export interface SseWritable {
  write(chunk: string): unknown;
}

export interface WriteSseEventOptions {
  /** SSE `event:` name (e.g. `change`). */
  event: string;
  /** JSON-serialized into the `data:` field. */
  data: unknown;
  /** Optional monotonic SSE `id:` for Last-Event-ID. */
  id?: string;
}

/**
 * Write one SSE event frame. Ends with a blank line per the SSE framing rules.
 */
export function writeSseEvent(
  target: SseWritable,
  options: WriteSseEventOptions,
): void {
  let frame = "";
  if (options.id !== undefined) {
    frame += `id: ${options.id}\n`;
  }
  frame += `event: ${options.event}\n`;
  frame += `data: ${JSON.stringify(options.data)}\n\n`;
  target.write(frame);
}

/**
 * Write an SSE comment line (useful as a keepalive heartbeat).
 * Format: `: <comment>\n\n`
 */
export function writeSseComment(target: SseWritable, comment: string): void {
  target.write(`: ${comment}\n\n`);
}

/**
 * CSRF-style check for cookie-authenticated long-lived GET (EventSource).
 * Missing/empty Origin is allowed (non-browser clients). When Origin is
 * present it must match an allowed app origin exactly.
 */
export function validateSseOrigin(
  origin: string | undefined,
  allowedOrigins: readonly string[],
): boolean {
  if (origin === undefined || origin === "") {
    return true;
  }
  return allowedOrigins.includes(origin);
}
