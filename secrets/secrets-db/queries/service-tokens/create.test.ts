import { describe, it, expect, beforeEach, afterEach, assert } from "vitest";
import type { DbKey } from "@saflib/drizzle";
import { secretsDb } from "../../index.ts";
import { create } from "./create.ts";
import { ServiceTokenAlreadyExistsError } from "../../errors.ts";

describe("create", () => {
  let dbKey: DbKey;

  beforeEach(() => {
    dbKey = secretsDb.connect();
  });

  afterEach(async () => {
    secretsDb.disconnect(dbKey);
  });

  it("should execute successfully", async () => {
    const { result } = await create(dbKey, {
      serviceName: "test-service",
      tokenHash: "test-hash-123",
      serviceVersion: "1.0.0",
    });
    expect(result).toBeDefined();
    assert(result);
    expect(result.serviceName).toBe("test-service");
    expect(result.tokenHash).toBe("test-hash-123");
    expect(result.serviceVersion).toBe("1.0.0");
    expect(result.approved).toBe(false);
    expect(result.accessCount).toBe(0);
    expect(result.id).toBeDefined();
    expect(result.requestedAt).toBeDefined();
  });

  it("should handle duplicate token hash error", async () => {
    // Create first service token
    await create(dbKey, {
      serviceName: "test-service-1",
      tokenHash: "duplicate-hash",
      serviceVersion: "1.0.0",
    });

    // Try to create second service token with same hash
    const { error } = await create(dbKey, {
      serviceName: "test-service-2",
      tokenHash: "duplicate-hash",
      serviceVersion: "2.0.0",
    });

    expect(error).toBeDefined();
    expect(error).toBeInstanceOf(ServiceTokenAlreadyExistsError);
  });
});
