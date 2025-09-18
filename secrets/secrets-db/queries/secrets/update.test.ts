import { describe, it, expect, beforeEach, afterEach, assert } from "vitest";
import type { DbKey } from "@saflib/drizzle";
import { secretsDb } from "../../index.ts";
import { update } from "./update.ts";
import { create } from "./create.ts";
import {
  SecretsNotFoundError,
  SecretAlreadyExistsError,
} from "../../errors.ts";

describe("update", () => {
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
      name: "test-secret-update",
      description: "Original description",
      valueEncrypted: Buffer.from("original-value"),
      createdBy: "test-user",
      isActive: true,
    });

    assert(createdSecret);

    // Then update it
    const { result } = await update(dbKey, {
      id: createdSecret.id,
      description: "Updated description",
      isActive: false,
    });

    expect(result).toBeDefined();
    assert(result);
    expect(result.id).toBe(createdSecret.id);
    expect(result.name).toBe("test-secret-update"); // unchanged
    expect(result.description).toBe("Updated description");
    expect(result.isActive).toBe(false);
    expect(result.createdBy).toBe("test-user"); // unchanged
  });

  it("should return error for non-existent id", async () => {
    const { error } = await update(dbKey, {
      id: "non-existent-id",
      description: "Updated description",
    });

    expect(error).toBeDefined();
    expect(error).toBeInstanceOf(SecretsNotFoundError);
  });

  it("should handle duplicate name error when updating name", async () => {
    // Create first secret
    const { result: firstSecret } = await create(dbKey, {
      name: "first-secret",
      description: "First secret",
      valueEncrypted: Buffer.from("first-value"),
      createdBy: "test-user",
      isActive: true,
    });

    // Create second secret
    const { result: secondSecret } = await create(dbKey, {
      name: "second-secret",
      description: "Second secret",
      valueEncrypted: Buffer.from("second-value"),
      createdBy: "test-user",
      isActive: true,
    });

    assert(firstSecret);
    assert(secondSecret);

    // Try to update second secret to have the same name as first
    const { error } = await update(dbKey, {
      id: secondSecret.id,
      name: "first-secret",
    });

    expect(error).toBeDefined();
    expect(error).toBeInstanceOf(SecretAlreadyExistsError);
  });
});
