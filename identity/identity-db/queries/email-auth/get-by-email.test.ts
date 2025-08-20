import { identityDb, usersDb, emailAuthDb } from "@saflib/identity-db";
import type { DbKey } from "@saflib/drizzle-sqlite3";
import { EmailAuthNotFoundError } from "../../errors.ts";
import { describe, it, expect, beforeEach, assert } from "vitest";

describe("getByEmail", () => {
  let dbKey: DbKey;

  beforeEach(() => {
    dbKey = identityDb.connect();
  });
  it("should get email auth by email", async () => {
    const { result: user } = await usersDb.create(dbKey, {
      email: "test@example.com",
    });
    assert(user);

    const passwordHash = Buffer.from([1, 2, 3]);
    const created = await emailAuthDb.create(dbKey, {
      userId: user.id,
      email: user.email,
      passwordHash,
    });

    const { result: auth } = await emailAuthDb.getByEmail(dbKey, user.email);
    expect(auth).toEqual(created);
  });

  it("should throw EmailAuthNotFoundError when email not found", async () => {
    const { error } = await emailAuthDb.getByEmail(
      dbKey,
      "nonexistent@example.com",
    );
    expect(error).toBeInstanceOf(EmailAuthNotFoundError);
  });
});
