import { describe, it, expect } from "vitest";
import {
  assertAuditMap,
  collectOpenApiRouteKeys,
} from "@saflib/audit-http/express/audit-map-assertions";
import { jsonSpec } from "@saflib/base-spec";
import { baseAuditMap } from "./audit-map.ts";

const specRouteKeys = collectOpenApiRouteKeys([jsonSpec]);

describe("baseAuditMap", () => {
  it("matches OpenAPI routes with valid keys and unique event types", () => {
    expect(() => assertAuditMap(baseAuditMap, specRouteKeys)).not.toThrow();
  });
});
