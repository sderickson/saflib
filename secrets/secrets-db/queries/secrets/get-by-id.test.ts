import { describe, it, expect, beforeEach, afterEach, assert } from "vitest";
import type { DbKey } from "@saflib/drizzle";
import { secretsDb } from "../../index.ts";
import { getById } from "./get-by-id.ts";
import { create } from "./create.ts";
import { SecretNotFoundError } from "../../errors.ts";

describe("getById", () => {
  let dbKey: DbKey;

  beforeEach(() => {
    dbKey = secretsDb.connect();
  });

  afterEach(async () => {
    secretsDb.disconnect(dbKey);
  });

  it("should execute successfully", async () => {
    // First create a secret
    const { result: createdSecret } = await create(dbKey, {
      name: "test-secret",
      description: "Test secret description",
      valueEncrypted: Buffer.from("encrypted-value"),
      createdBy: "test-user",
      isActive: true,
    });

    assert(createdSecret);

    // Then get it by id
    const { result } = await getById(dbKey, createdSecret.id);
    expect(result).toBeDefined();
    assert(result);
    expect(result.id).toBe(createdSecret.id);
    expect(result.name).toBe("test-secret");
    expect(result.description).toBe("Test secret description");
    expect(result.createdBy).toBe("test-user");
    expect(result.isActive).toBe(true);
  });

  it("should return error for non-existent id", async () => {
    const { error } = await getById(dbKey, "non-existent-id");
    expect(error).toBeDefined();
    expect(error).toBeInstanceOf(SecretNotFoundError);
  });
});
