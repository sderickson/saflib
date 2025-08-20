import { identityDbManager } from "../../instances.ts";
import { describe, it, expect, beforeEach } from "vitest";
import { usersDb } from "@saflib/identity-db";
import type { DbKey } from "@saflib/drizzle-sqlite3";
import { UserNotFoundError } from "../../errors.ts";

describe("getByEmail", () => {
  let dbKey: DbKey;

  beforeEach(() => {
    dbKey = identityDbManager.connect();
  });

  it("should return user by email", async () => {
    const user = {
      name: "Test User",
      email: "test@example.com",
      createdAt: new Date(),
    };

    const { result: created } = await usersDb.create(dbKey, user);
    const { result: fetched } = await usersDb.getByEmail(dbKey, user.email);

    expect(fetched).toEqual(created);
  });

  it("should throw UserNotFoundError when email not found", async () => {
    const { error } = await usersDb.getByEmail(
      dbKey,
      "nonexistent@example.com",
    );
    expect(error).toBeInstanceOf(UserNotFoundError);
  });
});
