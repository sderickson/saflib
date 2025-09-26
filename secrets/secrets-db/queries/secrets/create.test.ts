import { describe, it, expect, beforeEach, afterEach, assert } from "vitest";
import type { DbKey } from "@saflib/drizzle";
import { secretQueries } from "../../index.ts";
import { create } from "./create.ts";
import { SecretAlreadyExistsError } from "../../errors.ts";

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
      name: "test-secret",
      description: "Test secret description",
      valueEncrypted: Buffer.from("encrypted-value"),
      createdBy: "test-user",
      isActive: true,
    });
    expect(result).toBeDefined();
    assert(result);
    expect(result.name).toBe("test-secret");
    expect(result.description).toBe("Test secret description");
    expect(result.createdBy).toBe("test-user");
    expect(result.isActive).toBe(true);
    expect(result.id).toBeDefined();
    expect(result.createdAt).toBeDefined();
    expect(result.updatedAt).toBeDefined();
  });

  it("should handle duplicate name error", async () => {
    // Create first secret
    await create(dbKey, {
      name: "duplicate-test",
      description: "First secret",
      createdBy: "test-user",
      isActive: true,
      valueEncrypted: Buffer.from("encrypted-value"),
    });

    // Try to create second secret with same name
    const { error } = await create(dbKey, {
      name: "duplicate-test",
      description: "Second secret",
      createdBy: "test-user",
      isActive: true,
      valueEncrypted: Buffer.from("encrypted-value"),
    });

    expect(error).toBeDefined();
    expect(error).toBeInstanceOf(SecretAlreadyExistsError);
  });
});
