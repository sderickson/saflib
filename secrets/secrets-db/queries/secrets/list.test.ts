import { describe, it, expect, beforeEach, afterEach, assert } from "vitest";
import type { DbKey } from "@saflib/drizzle";
import { secretQueries } from "../../index.ts";
import { list } from "./list.ts";
import { create } from "./create.ts";

describe("list", () => {
  let dbKey: DbKey;

  beforeEach(() => {
    dbKey = secretQueries.connect();
  });

  afterEach(async () => {
    secretQueries.disconnect(dbKey);
  });

  it("should execute successfully and return empty array when no secrets", async () => {
    const { result } = await list(dbKey);
    expect(result).toBeDefined();
    assert(result);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });

  it("should return all secrets", async () => {
    // Create some test secrets
    const { result: secret1 } = await create(dbKey, {
      name: "test-secret-1",
      description: "First test secret",
      valueEncrypted: Buffer.from("encrypted-value-1"),
      createdBy: "test-user",
      isActive: true,
    });

    const { result: secret2 } = await create(dbKey, {
      name: "test-secret-2",
      description: "Second test secret",
      valueEncrypted: Buffer.from("encrypted-value-2"),
      createdBy: "test-user",
      isActive: false,
    });

    assert(secret1);
    assert(secret2);

    // List all secrets
    const { result } = await list(dbKey);
    expect(result).toBeDefined();
    assert(result);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);

    // Check that both secrets are in the result
    const secret1InList = result.find((s) => s.id === secret1.id);
    const secret2InList = result.find((s) => s.id === secret2.id);

    expect(secret1InList).toBeDefined();
    expect(secret1InList?.name).toBe("test-secret-1");
    expect(secret1InList?.isActive).toBe(true);

    expect(secret2InList).toBeDefined();
    expect(secret2InList?.name).toBe("test-secret-2");
    expect(secret2InList?.isActive).toBe(false);
  });
});
