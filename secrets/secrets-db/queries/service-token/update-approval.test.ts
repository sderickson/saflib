import { describe, it, expect, beforeEach, afterEach, assert } from "vitest";
import type { DbKey } from "@saflib/drizzle";
import { secretQueries } from "../../index.ts";
import { updateApproval } from "./update-approval.ts";
import { create } from "./create.ts";
import { ServiceTokenNotFoundError } from "../../errors.ts";

describe("updateApproval", () => {
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
      tokenHash: "test-hash-approval",
      serviceVersion: "1.0.0",
    });

    assert(createdToken);

    // Then update its approval status
    const { result } = await updateApproval(dbKey, {
      id: createdToken.id,
      approved: true,
      approvedBy: "admin-user",
    });

    expect(result).toBeDefined();
    assert(result);
    expect(result.id).toBe(createdToken.id);
    expect(result.approved).toBe(true);
    expect(result.approvedBy).toBe("admin-user");
    expect(result.approvedAt).toBeDefined();
    expect(result.serviceName).toBe("test-service"); // unchanged
  });

  it("should return error for non-existent id", async () => {
    const { error } = await updateApproval(dbKey, {
      id: "non-existent-id",
      approved: true,
      approvedBy: "admin-user",
    });

    expect(error).toBeDefined();
    expect(error).toBeInstanceOf(ServiceTokenNotFoundError);
  });
});
