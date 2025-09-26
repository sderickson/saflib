import { describe, it, expect, beforeEach, afterEach, assert } from "vitest";
import type { DbKey } from "@saflib/drizzle";
import { secretsDbManager } from "../../instances.ts";
import { lookup } from "./lookup.ts";
import { create } from "./create.ts";

describe("lookup", () => {
  let dbKey: DbKey;

  beforeEach(async () => {
    dbKey = secretsDbManager.connect();
    const { result: createdRequest } = await create(dbKey, {
      serviceName: "test-service",
      secretName: "test-secret-name",
    });
    assert(createdRequest);
  });

  afterEach(async () => {
    secretsDbManager.disconnect(dbKey);
  });

  it("should execute successfully", async () => {
    const { result } = await lookup(dbKey, {
      serviceName: "test-service",
      secretName: "test-secret-name",
    });
    expect(result).toBeDefined();
    assert(result);
    expect(result.serviceName).toBe("test-service");
    expect(result.secretName).toBe("test-secret-name");
  });
});
