import { describe, it, expect, beforeEach, afterEach, assert } from "vitest";
import type { DbKey } from "@saflib/drizzle";
import { secretsDb } from "../../index.ts";
import { updateUsage } from "./update-usage.ts";
import { create } from "./create.ts";
import { AccessRequestNotFoundError } from "../../errors.ts";

describe("updateUsage", () => {
  let dbKey: DbKey;

  beforeEach(() => {
    dbKey = secretsDb.connect();
  });

  afterEach(async () => {
    secretsDb.disconnect(dbKey);
  });

  it("should execute successfully", async () => {
    // First create an access request
    const { result: createdRequest } = await create(dbKey, {
      secretId: "test-secret-id",
      serviceName: "test-service",
    });

    assert(createdRequest);
    expect(createdRequest.accessCount).toBe(0);
    expect(createdRequest.lastAccessedAt).toBeNull();

    // Then update its usage
    const { result } = await updateUsage(dbKey, {
      id: createdRequest.id,
    });

    expect(result).toBeDefined();
    assert(result);
    expect(result.id).toBe(createdRequest.id);
    expect(result.accessCount).toBe(1);
    expect(result.lastAccessedAt).toBeDefined();
    expect(result.secretId).toBe("test-secret-id"); // unchanged
    expect(result.serviceName).toBe("test-service"); // unchanged
  });

  it("should return error for non-existent id", async () => {
    const { error } = await updateUsage(dbKey, {
      id: "non-existent-id",
    });

    expect(error).toBeDefined();
    expect(error).toBeInstanceOf(AccessRequestNotFoundError);
  });
});
