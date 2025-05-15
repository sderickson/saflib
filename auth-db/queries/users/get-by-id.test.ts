import { describe, it, expect, beforeEach } from "vitest";
import { authDbManager } from "../../instances.ts";
import type { DbKey } from "@saflib/drizzle-sqlite3";
import { authDb } from "../../index.ts";
import { UserNotFoundError } from "../../errors.ts";

describe("getById", () => {
  let dbKey: DbKey;

  beforeEach(() => {
    dbKey = authDbManager.connect();
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

  it("should throw UserNotFoundError when id not found", async () => {
    const { error } = await authDb.users.getById(dbKey, 999);
    expect(error).toBeInstanceOf(UserNotFoundError);
  });
});
