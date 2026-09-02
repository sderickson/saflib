import { describe, expect, it } from "vitest";
import { jsonSpec } from "@saflib/base-spec";
import { baseAuditMap } from "../audit-map.ts";

const auditKeyPattern = /^[A-Z]+ \/.+$/;

/** OpenAPI `/a/{id}` → the Express `/a/:id` form used as auditMap keys. */
function openApiPathToExpress(path: string): string {
  return path.replace(/\{([^}]+)\}/g, ":$1");
}

function specRouteKeys(): Set<string> {
  const keys = new Set<string>();
  const paths = (jsonSpec as { paths?: Record<string, unknown> }).paths ?? {};
  for (const [path, item] of Object.entries(paths)) {
    if (item === null || typeof item !== "object") continue;
    for (const method of Object.keys(item)) {
      keys.add(`${method.toUpperCase()} ${openApiPathToExpress(path)}`);
    }
  }
  return keys;
}

describe("baseAuditMap", () => {
  it("uses METHOD + space + path for every key (Express / OpenAPI route pattern)", () => {
    for (const key of Object.keys(baseAuditMap)) {
      expect(key, `invalid auditMap key: ${key}`).toMatch(auditKeyPattern);
    }
  });

  it("maps every key to a route that exists in the OpenAPI spec", () => {
    const known = specRouteKeys();
    const orphaned = Object.keys(baseAuditMap).filter((key) => !known.has(key));
    expect(
      orphaned,
      `auditMap keys with no matching OpenAPI operation (renamed or deleted route?): ${orphaned.join(", ")}`,
    ).toEqual([]);
  });

  it("uses a unique event type per route", () => {
    const seen = new Map<string, string>();
    for (const [key, entry] of Object.entries(baseAuditMap)) {
      const previous = seen.get(entry.eventType);
      expect(
        previous,
        `duplicate eventType "${entry.eventType}" on "${key}" and "${previous}"`,
      ).toBeUndefined();
      seen.set(entry.eventType, key);
    }
  });
});
