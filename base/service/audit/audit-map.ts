import type { AuditMapEntry } from "@saflib/audit-http/express/audit-map";

/**
 * Per-route opt-in for audit logging in the base golden product.
 * Key format: `"${METHOD} ${route_pattern}"` — Express-style `:param` patterns.
 *
 * Add entries when shipping routes via `openapi/route` (see workflow guidance).
 */
export const baseAuditMap: Record<string, AuditMapEntry> = {};
