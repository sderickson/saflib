import { describe, it, expect, beforeEach, afterEach, assert } from "vitest";
import type { DbKey } from "@saflib/drizzle";
import { secretQueries } from "../../index.ts";
import { remove } from "./remove.ts";
import { create } from "./create.ts";
import { SecretNotFoundError } from "../../errors.ts";

describe("remove", () => {
  let dbKey: DbKey;

  beforeEach(() => {
    dbKey = secretQueries.connect();
  });

  afterEach(async () => {
    secretQueries.disconnect(dbKey);
  });

  it("should execute successfully", async () => {
    // First create a secret
    const { result: createdSecret } = await create(dbKey, {
      name: "test-secret-remove",
      description: "Test secret to remove",
      valueEncrypted: Buffer.from("encrypted-value"),
      createdBy: "test-user",
      isActive: true,
    });

    assert(createdSecret);

    // Then remove it
    const { result } = await remove(dbKey, createdSecret.id);
    expect(result).toBeDefined();
    assert(result);
    expect(result.id).toBe(createdSecret.id);
    expect(result.name).toBe("test-secret-remove");
    expect(result.description).toBe("Test secret to remove");
    expect(result.createdBy).toBe("test-user");
    expect(result.isActive).toBe(true);
  });

  it("should return error for non-existent id", async () => {
    const { error } = await remove(dbKey, "non-existent-id");
    expect(error).toBeDefined();
    expect(error).toBeInstanceOf(SecretNotFoundError);
  });
});
