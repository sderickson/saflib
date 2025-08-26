import { describe, it, expect, beforeEach } from "vitest";
import { identityDb, usersDb } from "@saflib/identity-db";
import type { DbKey } from "@saflib/drizzle";
import { UserNotFoundError } from "../../errors.ts";

describe("updateProfile", () => {
  let dbKey: DbKey;

  beforeEach(() => {
    dbKey = identityDb.connect();
  });

  it("should update user profile fields successfully", async () => {
    const user = {
      name: "Original Name",
      email: "test@example.com",
      createdAt: new Date(),
    };

    const { result: created } = await usersDb.create(dbKey, user);

    const updateParams = {
      name: "Updated Name",
      givenName: "John",
      familyName: "Doe",
    };

    const { result: updated } = await usersDb.updateProfile(
      dbKey,
      created!.id,
      updateParams,
    );

    expect(updated).toBeDefined();
    expect(updated!.name).toBe("Updated Name");
    expect(updated!.givenName).toBe("John");
    expect(updated!.familyName).toBe("Doe");
    expect(updated!.email).toBe(user.email);
  });

  it("should update partial profile fields", async () => {
    const user = {
      name: "Original Name",
      email: "test@example.com",
      createdAt: new Date(),
    };

    const { result: created } = await usersDb.create(dbKey, user);

    const updateParams = {
      givenName: "Jane",
    };

    const { result: updated } = await usersDb.updateProfile(
      dbKey,
      created!.id,
      updateParams,
    );

    expect(updated).toBeDefined();
    expect(updated!.name).toBe("Original Name");
    expect(updated!.givenName).toBe("Jane");
    expect(updated!.familyName).toBeNull();
  });

  it("should return UserNotFoundError when user does not exist", async () => {
    const updateParams = {
      name: "Updated Name",
    };

    const { error } = await usersDb.updateProfile(dbKey, 999, updateParams);
    expect(error).toBeInstanceOf(UserNotFoundError);
  });
});
