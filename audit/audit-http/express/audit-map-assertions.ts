import type { AuditMapEntry } from "./audit-map.ts";

const AUDIT_KEY_PATTERN = /^[A-Z]+ \/.+$/;

/** OpenAPI `/a/{id}` → the Express `/a/:id` form used as auditMap keys. */
export function openApiPathToExpress(path: string): string {
  return path.replace(/\{([^}]+)\}/g, ":$1");
}

/** Collect `METHOD /path` keys from one or more OpenAPI documents. */
export function collectOpenApiRouteKeys(
  specs: ReadonlyArray<{ paths?: Record<string, unknown> }>,
): Set<string> {
  const keys = new Set<string>();
  for (const spec of specs) {
    const paths = spec.paths ?? {};
    for (const [path, item] of Object.entries(paths)) {
      if (item === null || typeof item !== "object") continue;
      for (const method of Object.keys(item)) {
        keys.add(`${method.toUpperCase()} ${openApiPathToExpress(path)}`);
      }
    }
  }
  return keys;
}

export function assertAuditMapKeyFormat(
  auditMap: Record<string, AuditMapEntry>,
): void {
  for (const key of Object.keys(auditMap)) {
    if (!AUDIT_KEY_PATTERN.test(key)) {
      throw new Error(`invalid auditMap key: ${key}`);
    }
  }
}

export function assertAuditMapRoutesExist(
  auditMap: Record<string, AuditMapEntry>,
  knownRouteKeys: Set<string>,
): void {
  const orphaned = Object.keys(auditMap).filter((key) => !knownRouteKeys.has(key));
  if (orphaned.length > 0) {
    throw new Error(
      `auditMap keys with no matching OpenAPI operation (renamed or deleted route?): ${orphaned.join(", ")}`,
    );
  }
}

export function assertAuditMapUniqueEventTypes(
  auditMap: Record<string, AuditMapEntry>,
): void {
  const seen = new Map<string, string>();
  for (const [key, entry] of Object.entries(auditMap)) {
    const previous = seen.get(entry.eventType);
    if (previous) {
      throw new Error(
        `duplicate eventType "${entry.eventType}" on "${key}" and "${previous}"`,
      );
    }
    seen.set(entry.eventType, key);
  }
}

/** Validate audit-map shape, OpenAPI coverage, and unique event types. */
export function assertAuditMap(
  auditMap: Record<string, AuditMapEntry>,
  specRouteKeys: Set<string>,
): void {
  assertAuditMapKeyFormat(auditMap);
  assertAuditMapRoutesExist(auditMap, specRouteKeys);
  assertAuditMapUniqueEventTypes(auditMap);
}
