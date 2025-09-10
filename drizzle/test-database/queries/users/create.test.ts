import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { DbKey } from "@saflib/drizzle";
import { mainDb } from "../../index.ts";
import {
  UserEmailAlreadyExistsError,
  InvalidUserDataError,
} from "../../errors.ts";
import { create } from "./create.ts";

describe("create", () => {
  let dbKey: DbKey;

  beforeEach(() => {
    dbKey = mainDb.connect();
  });

  afterEach(async () => {
    mainDb.disconnect(dbKey);
  });

  it("should create a user successfully", async () => {
    const { result } = await create(dbKey, {
      email: "test@example.com",
      name: "Test User",
    });

    expect(result).toBeDefined();
    expect(result?.email).toBe("test@example.com");
    expect(result?.name).toBe("Test User");
    expect(result?.id).toBeDefined();
  });

  it("should return InvalidUserDataError when email is missing", async () => {
    const { error } = await create(dbKey, {
      email: "",
      name: "Test User",
    });

    expect(error).toBeInstanceOf(InvalidUserDataError);
  });

  it("should return InvalidUserDataError when name is missing", async () => {
    const { error } = await create(dbKey, {
      email: "test@example.com",
      name: "",
    });

    expect(error).toBeInstanceOf(InvalidUserDataError);
  });

  it("should return UserEmailAlreadyExistsError when email already exists", async () => {
    // Create first user
    await create(dbKey, {
      email: "duplicate@example.com",
      name: "First User",
    });

    // Try to create second user with same email
    const { error } = await create(dbKey, {
      email: "duplicate@example.com",
      name: "Second User",
    });

    expect(error).toBeInstanceOf(UserEmailAlreadyExistsError);
  });
});
