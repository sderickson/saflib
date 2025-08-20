import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { DbKey } from "@saflib/drizzle-sqlite3";
import { identityDb, UserNotFoundError } from "@saflib/identity-db";

describe("getById", () => {
  let dbKey: DbKey;

  beforeEach(() => {
    dbKey = identityDb.connect();
  });

  afterEach(() => {
    identityDb.disconnect(dbKey);
  });

  it("should return user by id", async () => {
    const user = {
      name: "Test User",
      email: "test@example.com",
      createdAt: new Date(),
    };

    const { result: created } = await identityDb.users.create(dbKey, user);
    const { result: fetched } = await identityDb.users.getById(
      dbKey,
      created!.id,
    );

    expect(fetched).toEqual(created);
  });

  it("should return UserNotFoundError when id not found", async () => {
    const { error } = await identityDb.users.getById(dbKey, 999);
    expect(error).toBeInstanceOf(UserNotFoundError);
  });
});
