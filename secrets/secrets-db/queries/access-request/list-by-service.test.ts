import { describe, it, expect, beforeEach, afterEach, assert } from "vitest";
import type { DbKey } from "@saflib/drizzle";
import { secretsDb } from "../../index.ts";
import { listByService } from "./list-by-service.ts";
import { create } from "./create.ts";

describe("listByService", () => {
  let dbKey: DbKey;

  beforeEach(() => {
    dbKey = secretsDb.connect();
  });

  afterEach(async () => {
    secretsDb.disconnect(dbKey);
  });

  it("should execute successfully and return empty array when no requests for service", async () => {
    const { result } = await listByService(dbKey, "non-existent-service");
    expect(result).toBeDefined();
    assert(result);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });

  it("should return only access requests for the specified service", async () => {
    // Create some test access requests
    const { result: request1 } = await create(dbKey, {
      secretId: "test-secret-1",
      serviceName: "test-service",
    });

    const { result: request2 } = await create(dbKey, {
      secretId: "test-secret-2",
      serviceName: "test-service",
    });

    const { result: request3 } = await create(dbKey, {
      secretId: "test-secret-3",
      serviceName: "other-service",
    });

    assert(request1);
    assert(request2);
    assert(request3);

    // List requests for test-service
    const { result } = await listByService(dbKey, "test-service");
    expect(result).toBeDefined();
    assert(result);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);

    // Check that only requests for test-service are in the result
    const serviceNames = result.map((r) => r.serviceName);
    expect(serviceNames).toEqual(["test-service", "test-service"]);

    // Check that the other service's request is not included
    const otherServiceRequest = result.find((r) => r.id === request3.id);
    expect(otherServiceRequest).toBeUndefined();
  });
});
