import { describe, it, expect, beforeEach, afterEach, assert } from "vitest";
import type { DbKey } from "@saflib/drizzle";
import { secretsDb } from "../../index.ts";
import { list } from "./list.ts";
import { create } from "./create.ts";

describe("list", () => {
  let dbKey: DbKey;

  beforeEach(() => {
    dbKey = secretsDb.connect();
  });

  afterEach(async () => {
    secretsDb.disconnect(dbKey);
  });

  it("should execute successfully and return empty array when no service tokens", async () => {
    const { result } = await list(dbKey);
    expect(result).toBeDefined();
    assert(result);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });

  it("should return all service tokens", async () => {
    // Create some test service tokens
    const { result: token1 } = await create(dbKey, {
      serviceName: "test-service-1",
      tokenHash: "test-hash-1",
      serviceVersion: "1.0.0",
    });

    const { result: token2 } = await create(dbKey, {
      serviceName: "test-service-2",
      tokenHash: "test-hash-2",
      serviceVersion: "2.0.0",
    });

    assert(token1);
    assert(token2);

    // List all service tokens
    const { result } = await list(dbKey);
    expect(result).toBeDefined();
    assert(result);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);

    // Check that both tokens are in the result
    const token1InList = result.find((t) => t.id === token1.id);
    const token2InList = result.find((t) => t.id === token2.id);

    expect(token1InList).toBeDefined();
    expect(token1InList?.serviceName).toBe("test-service-1");
    expect(token1InList?.tokenHash).toBe("test-hash-1");

    expect(token2InList).toBeDefined();
    expect(token2InList?.serviceName).toBe("test-service-2");
    expect(token2InList?.tokenHash).toBe("test-hash-2");
  });
});
