import { describe, it, expect, beforeEach, afterEach, assert } from "vitest";
import type { DbKey } from "@saflib/drizzle";
import { secretQueries } from "../../index.ts";
import { create } from "./create.ts";
import { AccessRequestAlreadyExistsError } from "../../errors.ts";

describe("create", () => {
  let dbKey: DbKey;

  beforeEach(() => {
    dbKey = secretQueries.connect();
  });

  afterEach(async () => {
    secretQueries.disconnect(dbKey);
  });

  it("should execute successfully", async () => {
    const { result } = await create(dbKey, {
      secretId: "test-secret-id",
      serviceName: "test-service",
      status: "pending",
    });
    expect(result).toBeDefined();
    assert(result);
    expect(result.secretId).toBe("test-secret-id");
    expect(result.serviceName).toBe("test-service");
    expect(result.status).toBe("pending");
    expect(result.accessCount).toBe(0);
    expect(result.id).toBeDefined();
    expect(result.requestedAt).toBeDefined();
  });

  it("should handle duplicate access request error", async () => {
    // Create first access request
    await create(dbKey, {
      secretId: "test-secret-id",
      serviceName: "test-service",
      status: "pending",
    });

    // Try to create second access request with same secretId and serviceName
    const { error } = await create(dbKey, {
      secretId: "test-secret-id",
      serviceName: "test-service",
      status: "granted",
    });

    expect(error).toBeDefined();
    expect(error).toBeInstanceOf(AccessRequestAlreadyExistsError);
  });
});
