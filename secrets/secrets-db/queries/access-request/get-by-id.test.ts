import { describe, it, expect, beforeEach, afterEach, assert } from "vitest";
import type { DbKey } from "@saflib/drizzle";
import { secretsDb } from "../../index.ts";
import { getById } from "./get-by-id.ts";
import { create } from "./create.ts";
import { AccessRequestNotFoundError } from "../../errors.ts";

describe("getById", () => {
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
      status: "pending",
    });

    assert(createdRequest);

    // Then get it by id
    const { result } = await getById(dbKey, createdRequest.id);
    expect(result).toBeDefined();
    assert(result);
    expect(result.id).toBe(createdRequest.id);
    expect(result.secretId).toBe("test-secret-id");
    expect(result.serviceName).toBe("test-service");
    expect(result.status).toBe("pending");
  });

  it("should return error for non-existent id", async () => {
    const { error } = await getById(dbKey, "non-existent-id");
    expect(error).toBeDefined();
    expect(error).toBeInstanceOf(AccessRequestNotFoundError);
  });
});
