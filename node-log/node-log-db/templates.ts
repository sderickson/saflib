import { createHash } from "node:crypto";

const MAX_TEMPLATE_CHARS = 300;

/**
 * Collapse a (redacted) log message into its shape, so lines that differ only
 * by ids, numbers or quoted values share one template. Applied in order;
 * earlier rules protect their output from later ones.
 */
const RULES: Array<[RegExp, string]> = [
  [/\[redacted:[a-z_]+\]/g, "<redacted>"],
  [/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, "<uuid>"],
  [/\b\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?\b/g, "<time>"],
  [/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, "<ip>"],
  [/"(?:[^"\\]|\\.)*"/g, '"<str>"'],
  [/'(?:[^'\\]|\\.)*'/g, "'<str>'"],
  [/\b[0-9a-f]{8,}\b/gi, "<hex>"],
  // Mixed letters and digits, e.g. generated short ids (xK3p9QmZ2a).
  [/\b(?=[A-Za-z0-9_-]*\d)(?=[A-Za-z0-9_-]*[A-Za-z])[A-Za-z0-9_-]{8,}\b/g, "<id>"],
  [/\b\d+(?:\.\d+)?/g, "<n>"],
  [/\s+/g, " "],
];

export function normalizeTemplate(message: string): string {
  let t = message;
  for (const [re, replacement] of RULES) t = t.replace(re, replacement);
  t = t.trim();
  return t.length > MAX_TEMPLATE_CHARS ? `${t.slice(0, MAX_TEMPLATE_CHARS)}…` : t;
}

/** Stable short id for a template within a service. */
export function templateHash(serviceName: string | null, template: string): string {
  return createHash("sha256")
    .update(`${serviceName ?? ""}\u0000${template}`)
    .digest("hex")
    .slice(0, 16);
}
