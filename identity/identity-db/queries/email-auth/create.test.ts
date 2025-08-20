import { beforeEach, describe, expect, it, assert } from "vitest";
import { identityDb, usersDb, emailAuthDb } from "@saflib/identity-db";
import type { DbKey } from "@saflib/drizzle-sqlite3";

describe("create email auth", () => {
  let dbKey: DbKey;

  beforeEach(async () => {
    dbKey = identityDb.connect();
  });

  it("should create email auth for a user", async () => {
    const { result: user } = await usersDb.create(dbKey, {
      email: "test@example.com",
    });
    assert(user);

    const passwordHash = Buffer.from([1, 2, 3]);
    const auth = await emailAuthDb.create(dbKey, {
      userId: user.id,
      email: user.email,
      passwordHash,
    });

    expect(auth).toMatchObject({
      userId: user.id,
      email: user.email,
      passwordHash,
    });
  });
});
