import { describe, it, expect, beforeEach, afterEach, assert } from "vitest";
import type { DbKey } from "@saflib/drizzle";
import { secretQueries } from "../../index.ts";
import { listPending } from "./list-pending.ts";
import { create } from "./create.ts";
import { updateStatus } from "./update-status.ts";

describe("listPending", () => {
  let dbKey: DbKey;

  beforeEach(() => {
    dbKey = secretQueries.connect();
  });

  afterEach(async () => {
    secretQueries.disconnect(dbKey);
  });

  it("should execute successfully and return empty array when no pending requests", async () => {
    const { result } = await listPending(dbKey);
    expect(result).toBeDefined();
    assert(result);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });

  it("should return only pending access requests", async () => {
    // Create some test access requests
    const { result: pendingRequest } = await create(dbKey, {
      secretId: "test-secret-1",
      serviceName: "test-service-1",
      status: "pending",
    });

    const { result: approvedRequest } = await create(dbKey, {
      secretId: "test-secret-2",
      serviceName: "test-service-2",
      status: "pending",
    });

    assert(pendingRequest);
    assert(approvedRequest);

    // Approve one request
    await updateStatus(dbKey, {
      id: approvedRequest.id,
      status: "granted",
      grantedBy: "admin-user",
    });

    // List pending requests
    const { result } = await listPending(dbKey);
    expect(result).toBeDefined();
    assert(result);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(1);

    // Check that only the pending request is in the result
    expect(result[0].id).toBe(pendingRequest.id);
    expect(result[0].status).toBe("pending");
  });
});
