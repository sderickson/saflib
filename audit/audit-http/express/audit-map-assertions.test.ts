import { describe, expect, it } from "vitest";
import type { AuditMapEntry } from "./audit-map.ts";
import {
  assertAuditMap,
  assertAuditMapKeyFormat,
  assertAuditMapRoutesExist,
  assertAuditMapUniqueEventTypes,
  collectOpenApiRouteKeys,
  openApiPathToExpress,
} from "./audit-map-assertions.ts";

describe("openApiPathToExpress", () => {
  it("rewrites path params", () => {
    expect(openApiPathToExpress("/users/{id}")).toBe("/users/:id");
  });
});

describe("collectOpenApiRouteKeys", () => {
  it("collects method + path keys from specs", () => {
    const keys = collectOpenApiRouteKeys([
      {
        paths: {
          "/health": { get: {} },
          "/users/{id}": { put: {} },
        },
      },
    ]);
    expect(keys).toEqual(new Set(["GET /health", "PUT /users/:id"]));
  });
});

describe("assertAuditMap", () => {
  const validMap: Record<string, AuditMapEntry> = {
    "PUT /users/:id": {
      eventType: "user.update",
      resourceType: "user",
    },
  };

  it("passes a consistent map", () => {
    expect(() =>
      assertAuditMap(validMap, new Set(["PUT /users/:id"])),
    ).not.toThrow();
  });

  it("rejects invalid key format", () => {
    expect(() =>
      assertAuditMapKeyFormat({ "bad-key": validMap["PUT /users/:id"]! }),
    ).toThrow(/invalid auditMap key/);
  });

  it("rejects orphaned routes", () => {
    expect(() =>
      assertAuditMapRoutesExist(validMap, new Set(["GET /health"])),
    ).toThrow(/no matching OpenAPI operation/);
  });

  it("rejects duplicate event types", () => {
    expect(() =>
      assertAuditMapUniqueEventTypes({
        "PUT /a": { eventType: "same", resourceType: "a" },
        "POST /b": { eventType: "same", resourceType: "b" },
      }),
    ).toThrow(/duplicate eventType/);
  });
});
