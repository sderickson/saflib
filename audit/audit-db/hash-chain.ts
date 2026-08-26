import { createHash } from "node:crypto";
import { canonicalizeAuditRow } from "./canonicalize.ts";
import type { AuditRowContent } from "./types.ts";

/** Genesis `prev_hash` for the first row after a fresh rotation (64 hex zero digits). */
export const GENESIS_HASH = "0".repeat(64);

export function computeRowHash(prevHash: string, content: AuditRowContent): string {
  const payload = `${prevHash}\n${canonicalizeAuditRow(content)}`;
  return createHash("sha256").update(payload, "utf8").digest("hex");
}
