import { describe, it, expect, beforeEach, afterEach, assert } from "vitest";
import type { DbKey } from "@saflib/drizzle";
import { secretQueries } from "../../index.ts";
import { updateUsage } from "./update-usage.ts";
import { create } from "./create.ts";
import { ServiceTokenNotFoundError } from "../../errors.ts";

describe("updateUsage", () => {
  let dbKey: DbKey;

  beforeEach(() => {
    dbKey = secretQueries.connect();
  });

  afterEach(async () => {
    secretQueries.disconnect(dbKey);
  });

  it("should execute successfully", async () => {
    // First create a service token
    const { result: createdToken } = await create(dbKey, {
      serviceName: "test-service",
      tokenHash: "test-hash-usage",
      serviceVersion: "1.0.0",
    });

    assert(createdToken);
    expect(createdToken.accessCount).toBe(0);
    expect(createdToken.lastUsedAt).toBeNull();

    // Then update its usage
    const { result } = await updateUsage(dbKey, {
      id: createdToken.id,
    });

    expect(result).toBeDefined();
    assert(result);
    expect(result.id).toBe(createdToken.id);
    expect(result.accessCount).toBe(1);
    expect(result.lastUsedAt).toBeDefined();
    expect(result.serviceName).toBe("test-service"); // unchanged
  });

  it("should return error for non-existent id", async () => {
    const { error } = await updateUsage(dbKey, {
      id: "non-existent-id",
    });

    expect(error).toBeDefined();
    expect(error).toBeInstanceOf(ServiceTokenNotFoundError);
  });
});
