import { describe, it, expect, beforeEach, afterEach, assert } from "vitest";
import type { DbKey } from "@saflib/drizzle";
import { secretQueries } from "../../index.ts";
import { updateStatus } from "./update-status.ts";
import { create } from "./create.ts";
import { AccessRequestNotFoundError } from "../../errors.ts";

describe("updateStatus", () => {
  let dbKey: DbKey;

  beforeEach(() => {
    dbKey = secretQueries.connect();
  });

  afterEach(async () => {
    secretQueries.disconnect(dbKey);
  });

  it("should execute successfully", async () => {
    // First create an access request
    const { result: createdRequest } = await create(dbKey, {
      secretId: "test-secret-id",
      serviceName: "test-service",
      status: "pending",
    });

    assert(createdRequest);

    // Then update its status
    const { result } = await updateStatus(dbKey, {
      id: createdRequest.id,
      status: "granted",
      grantedBy: "admin-user",
    });

    expect(result).toBeDefined();
    assert(result);
    expect(result.id).toBe(createdRequest.id);
    expect(result.status).toBe("granted");
    expect(result.grantedBy).toBe("admin-user");
    expect(result.grantedAt).toBeDefined();
    expect(result.secretId).toBe("test-secret-id"); // unchanged
    expect(result.serviceName).toBe("test-service"); // unchanged
  });

  it("should return error for non-existent id", async () => {
    const { error } = await updateStatus(dbKey, {
      id: "non-existent-id",
      status: "granted",
      grantedBy: "admin-user",
    });

    expect(error).toBeDefined();
    expect(error).toBeInstanceOf(AccessRequestNotFoundError);
  });
});
