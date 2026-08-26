import type { AuditRowContent } from "./types.ts";

function sortKeysDeep(value: unknown): unknown {
  if (value === null) {
    return null;
  }
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep);
  }
  if (typeof value !== "object") {
    return value;
  }
  const obj = value as Record<string, unknown>;
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(obj).sort()) {
    sorted[key] = sortKeysDeep(obj[key]);
  }
  return sorted;
}

/**
 * Deterministic JSON: sorted keys at every object level, no whitespace, JSON numbers
 * (not strings), `null` preserved, arrays keep element order.
 */
export function canonicalizeAuditRow(content: AuditRowContent): string {
  return JSON.stringify(sortKeysDeep(content));
}
