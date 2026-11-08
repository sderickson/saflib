import { createHash } from "node:crypto";
import { normalizeTemplate } from "@saflib/utils/telemetry-template";

/** V8 (`at fn (path:1:2)`) and Firefox/Safari (`fn@url:1:2`) frames. */
const V8_FRAME = /^\s*at\s+(?:(.+?)\s+\()?(.+?):\d+:\d+\)?\s*$/;
const GECKO_FRAME = /^\s*([^@\s]*)@(.+?):\d+:\d+\s*$/;

/** A frame from our own code, normalized so line numbers and build hashes don't split groups. */
function normalizeFrame(fn: string | undefined, location: string): string | undefined {
  if (/node_modules|node:internal|^node:|<anonymous>|^native$/.test(location)) return undefined;
  let path = location
    .replace(/^file:\/\//, "")
    .replace(/^https?:\/\/[^/]+\//, "")
    .replace(/\?.*$/, "");
  // Bundled file names carry a content hash: index-B2xQ9z1a.js → index.js.
  path = path.replace(/[-.][A-Za-z0-9_]{8,}(\.m?js)$/, "$1");
  const segments = path.split("/").filter(Boolean);
  const short = segments.slice(-3).join("/");
  return `${(fn ?? "").replace(/^async\s+/, "") || "<anon>"} ${short}`;
}

/** Our own frames, innermost first, normalized. */
export function inAppFrames(stack: string, max = 5): string[] {
  const frames: string[] = [];
  for (const line of stack.split("\n")) {
    const m = V8_FRAME.exec(line) ?? GECKO_FRAME.exec(line);
    if (!m) continue;
    const f = normalizeFrame(m[1], m[2]!);
    if (f) frames.push(f);
    if (frames.length >= max) break;
  }
  return frames;
}

/** `TypeError` from `TypeError: x is undefined`, for stacks without an Error object. */
export function errorNameFromStack(stack: string): string | undefined {
  return /^([A-Z][A-Za-z]*(?:Error|Exception))\b/.exec(stack.trim())?.[1];
}

export interface FingerprintInput {
  serviceName: string | null;
  /** Caller-chosen grouping key; wins over everything else. */
  fingerprint?: string;
  errorName?: string;
  stack?: string;
  /** Redacted message. */
  message: string;
}

/**
 * How occurrences group into issues: an explicit fingerprint if given; else
 * the error name plus our top stack frames; else (no useful stack, typical
 * for warnings) the message's shape.
 */
export function computeFingerprint(input: FingerprintInput): string {
  const service = input.serviceName ?? "";
  let key: string;
  if (input.fingerprint) {
    key = `explicit|${input.fingerprint}`;
  } else {
    const frames = input.stack ? inAppFrames(input.stack) : [];
    key =
      frames.length > 0
        ? `stack|${input.errorName ?? "Error"}|${frames.join(";")}`
        : `message|${normalizeTemplate(input.message)}`;
  }
  return createHash("sha256").update(`${service}\u0000${key}`).digest("hex").slice(0, 24);
}
