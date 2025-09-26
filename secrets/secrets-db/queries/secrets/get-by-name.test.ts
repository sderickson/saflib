import { describe, it, expect, beforeEach, afterEach, assert } from "vitest";
import type { DbKey } from "@saflib/drizzle";
import { secretQueries } from "../../index.ts";
import { getByName } from "./get-by-name.ts";
import { create } from "./create.ts";
import { SecretNotFoundError } from "../../errors.ts";

describe("getByName", () => {
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
      name: "test-secret-by-name",
      description: "Test secret description",
      valueEncrypted: Buffer.from("encrypted-value"),
      createdBy: "test-user",
      isActive: true,
    });

    assert(createdSecret);

    // Then get it by name
    const { result } = await getByName(dbKey, "test-secret-by-name");
    expect(result).toBeDefined();
    assert(result);
    expect(result.id).toBe(createdSecret.id);
    expect(result.name).toBe("test-secret-by-name");
    expect(result.description).toBe("Test secret description");
    expect(result.createdBy).toBe("test-user");
    expect(result.isActive).toBe(true);
  });

  it("should return error for non-existent name", async () => {
    const { error } = await getByName(dbKey, "non-existent-name");
    expect(error).toBeDefined();
    expect(error).toBeInstanceOf(SecretNotFoundError);
  });
});
