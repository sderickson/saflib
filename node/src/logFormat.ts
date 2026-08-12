import { typedEnv } from "../env.ts";

/**
 * Shared compact log timestamp: `MM-DD HH:mm` (UTC when TZ=UTC).
 */
export function formatCompactTimestamp(date = new Date()): string {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${mm}-${dd} ${hh}:${min}`;
}

/** Fixed visual width for the HTTP channel marker column. */
export const HTTP_CHANNEL_MARKER_WIDTH = 4;

const ANSI_RESET = "\u001b[0m";
const ANSI_BOLD = "\u001b[1m";
const ANSI_DIM = "\u001b[2m";

/** Access-log duration above this (ms) is highlighted when ANSI styling is on. */
export const HTTP_ACCESS_SLOW_MS = 500;

/** Response body at or above this size (bytes) is highlighted when ANSI styling is on. */
export const HTTP_ACCESS_LARGE_BYTES = 100 * 1024;

function ansiBold(text: string): string {
  return `${ANSI_BOLD}${text}${ANSI_RESET}`;
}

/**
 * Browser/client traffic — heavy bar, arrow leans left (inbound from the edge).
 * Unicode: BLACK LEFT-POINTING POINTER + HEAVY HORIZONTAL.
 */
export const HTTP_CHANNEL_CLIENT_PLAIN = "◀━━ ";

/**
 * Internal background traffic — light bar, arrow leans right (outbound dispatch).
 * Unicode: LIGHT HORIZONTAL + RIGHT-POINTING SMALL TRIANGLE.
 */
export const HTTP_CHANNEL_INTERNAL_PLAIN = " ──▷";

export function httpAccessAnsiEnabled(): boolean {
  return typedEnv.NODE_ENV === "development";
}

export function httpChannelIndicator(
  internal: boolean,
  ansi = httpAccessAnsiEnabled(),
): string {
  const plain = internal
    ? HTTP_CHANNEL_INTERNAL_PLAIN
    : HTTP_CHANNEL_CLIENT_PLAIN;
  if (!ansi) {
    return plain;
  }
  return internal
    ? `${ANSI_DIM}${plain}${ANSI_RESET}`
    : `${ANSI_BOLD}${plain}${ANSI_RESET}`;
}

/** Fixed 6-char response size; kb when > 1024 bytes. */
export const HTTP_ACCESS_SIZE_WIDTH = 6;

/** Fixed 6-char duration (` 325ms` / ` 72.2s`). */
export const HTTP_ACCESS_DURATION_WIDTH = 6;

/** Fixed 3-char HTTP status for access-log alignment. */
export function formatHttpStatus(status: number | undefined): string {
  if (status == null || status === 0) {
    return "---";
  }
  return String(status).padStart(3, " ");
}

/**
 * Fixed 6-char duration for access-log columns.
 * Under 10s: ` 325ms`. At/above 10s: ` 72.2s` / ` 999s` so long requests
 * are never left-truncated (e.g. `72233ms` must not become `2233ms`).
 */
export function formatHttpDurationMs(ms: number): string {
  const rounded = Math.max(0, Math.round(ms));
  let raw: string;
  if (rounded < 10_000) {
    raw = `${rounded}ms`;
  } else if (rounded < 1_000_000) {
    const secs = rounded / 1000;
    raw =
      secs < 100 ? `${secs.toFixed(1)}s` : `${Math.round(secs)}s`;
  } else {
    const mins = rounded / 60_000;
    raw =
      mins < 100 ? `${mins.toFixed(1)}m` : `${Math.round(mins)}m`;
  }
  if (raw.length > HTTP_ACCESS_DURATION_WIDTH) {
    // Prefer a coarser unit over chopping leading digits.
    if (rounded >= 10_000 && rounded < 1_000_000) {
      raw = `${Math.round(rounded / 1000)}s`;
    } else if (rounded >= 1_000_000) {
      raw = `${Math.round(rounded / 60_000)}m`;
    }
    if (raw.length > HTTP_ACCESS_DURATION_WIDTH) {
      raw = raw.slice(0, HTTP_ACCESS_DURATION_WIDTH);
    }
  }
  return raw.padStart(HTTP_ACCESS_DURATION_WIDTH, " ");
}

/** Fixed 6-char response size; kb when > 1024 bytes. */
export function formatHttpResponseSize(
  bytes: number | string | undefined | null,
): string {
  if (bytes == null || bytes === "") {
    return "-".padStart(HTTP_ACCESS_SIZE_WIDTH, " ");
  }
  const n = Number(bytes);
  if (!Number.isFinite(n) || n < 0) {
    return "-".padStart(HTTP_ACCESS_SIZE_WIDTH, " ");
  }
  if (n === 0) {
    return "0b".padStart(HTTP_ACCESS_SIZE_WIDTH, " ");
  }
  if (n > 1024) {
    const kb = Math.round(n / 1024);
    return `${kb}kb`.padStart(HTTP_ACCESS_SIZE_WIDTH, " ");
  }
  return `${n}b`.padStart(HTTP_ACCESS_SIZE_WIDTH, " ");
}

/** Fixed 5-char HTTP method so paths align (`GET  ` vs `PATCH`). */
export function formatHttpMethod(method: string): string {
  return method.padEnd(5, " ");
}

function formatHttpAccessDurationField(ms: number, ansi: boolean): string {
  const plain = formatHttpDurationMs(ms);
  if (!ansi) {
    return plain;
  }
  const rounded = Math.max(0, Math.round(ms));
  return rounded > HTTP_ACCESS_SLOW_MS ? ansiBold(plain) : plain;
}

function formatHttpAccessSizeField(
  bytes: number | string | undefined | null,
  ansi: boolean,
): string {
  const plain = formatHttpResponseSize(bytes);
  if (!ansi) {
    return plain;
  }
  const n = Number(bytes);
  if (Number.isFinite(n) && n >= HTTP_ACCESS_LARGE_BYTES) {
    return ansiBold(plain);
  }
  return plain;
}

export function formatHttpAccessLine(opts: {
  timestamp?: Date;
  internal: boolean;
  status: number | undefined;
  durationMs: number;
  sizeBytes: number | string | undefined | null;
  method: string;
  url: string;
  ansi?: boolean;
}): string {
  const ansi = opts.ansi ?? httpAccessAnsiEnabled();
  const ts = formatCompactTimestamp(opts.timestamp);
  const channel = httpChannelIndicator(opts.internal, ansi);
  const status = formatHttpStatus(opts.status);
  const dur = formatHttpAccessDurationField(opts.durationMs, ansi);
  const size = formatHttpAccessSizeField(opts.sizeBytes, ansi);
  const method = formatHttpMethod(opts.method);
  return `${ts} ${channel} ${status} ${dur} ${size} ${method} ${opts.url}`;
}
