import { describe, it, expect, beforeEach, afterEach, assert } from "vitest";
import type { DbKey } from "@saflib/drizzle";
import { secretQueries } from "../../index.ts";
import { getByHash } from "./get-by-hash.ts";
import { create } from "./create.ts";
import { ServiceTokenNotFoundError } from "../../errors.ts";

describe("getByHash", () => {
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
      tokenHash: "test-hash-123",
      serviceVersion: "1.0.0",
    });

    assert(createdToken);

    // Then get it by hash
    const { result } = await getByHash(dbKey, "test-hash-123");
    expect(result).toBeDefined();
    assert(result);
    expect(result.id).toBe(createdToken.id);
    expect(result.serviceName).toBe("test-service");
    expect(result.tokenHash).toBe("test-hash-123");
    expect(result.serviceVersion).toBe("1.0.0");
  });

  it("should return error for non-existent hash", async () => {
    const { error } = await getByHash(dbKey, "non-existent-hash");
    expect(error).toBeDefined();
    expect(error).toBeInstanceOf(ServiceTokenNotFoundError);
  });
});
