import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { DbKey } from "@saflib/drizzle";
import { secretsDb, SecretAlreadyExistsError } from "@saflib/secrets-db";
import type { CreateSecretsParams } from "@saflib/secrets-db";

describe("create", () => {
  let dbKey: DbKey;

  beforeEach(() => {
    dbKey = secretsDb.connect();
  });

  afterEach(async () => {
    secretsDb.disconnect(dbKey);
  });

  it("should create a secret successfully", async () => {
    const params: CreateSecretsParams = {
      name: "TEST_SECRET",
      description: "A test secret",
      valueEncrypted: Buffer.from("encrypted_value"),
      createdBy: "test-user",
      isActive: true,
    };

    const { result } = await secretsDb.secrets.create(dbKey, params);

    expect(result).toBeDefined();
    expect(result.name).toBe(params.name);
    expect(result.description).toBe(params.description);
    expect(result.createdBy).toBe(params.createdBy);
    expect(result.isActive).toBe(params.isActive);
    expect(result.id).toBeDefined();
    expect(result.createdAt).toBeDefined();
    expect(result.updatedAt).toBeDefined();
  });

  it("should create a secret with minimal required fields", async () => {
    const params: CreateSecretsParams = {
      name: "MINIMAL_SECRET",
      description: null,
      valueEncrypted: null,
      createdBy: "test-user",
      isActive: true,
    };

    const { result } = await secretsDb.secrets.create(dbKey, params);

    expect(result).toBeDefined();
    expect(result.name).toBe(params.name);
    expect(result.description).toBeNull();
    expect(result.valueEncrypted).toBeNull();
    expect(result.createdBy).toBe(params.createdBy);
    expect(result.isActive).toBe(true); // default value
  });

  it("should fail when creating a secret with duplicate name", async () => {
    const params: CreateSecretsParams = {
      name: "DUPLICATE_SECRET",
      description: "First secret",
      valueEncrypted: null,
      createdBy: "test-user",
      isActive: true,
    };

    // Create first secret
    await secretsDb.secrets.create(dbKey, params);

    // Try to create second secret with same name
    const duplicateParams: CreateSecretsParams = {
      ...params,
      description: "Second secret",
    };

    const { error } = await secretsDb.secrets.create(dbKey, duplicateParams);

    expect(error).toBeDefined();
    expect(error).toBeInstanceOf(SecretAlreadyExistsError);
  });
});
