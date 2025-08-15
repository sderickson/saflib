import { describe, it, expect, beforeEach } from "vitest";
import type { DbKey } from "@saflib/drizzle-sqlite3";
import { authDb, UserNotFoundError } from "@saflib/identity-db";

describe("getById", () => {
  let dbKey: DbKey;

  beforeEach(() => {
    dbKey = authDb.connect();
  });

  it("should return user by id", async () => {
    const user = {
      name: "Test User",
      email: "test@example.com",
      createdAt: new Date(),
    };

    const { result: created } = await authDb.users.create(dbKey, user);
    const { result: fetched } = await authDb.users.getById(dbKey, created!.id);

    expect(fetched).toEqual(created);
  });

  it("should return UserNotFoundError when id not found", async () => {
    const { error } = await authDb.users.getById(dbKey, 999);
    expect(error).toBeInstanceOf(UserNotFoundError);
  });
});
