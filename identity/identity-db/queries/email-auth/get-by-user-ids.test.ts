import type { DbKey } from "@saflib/drizzle";
import { identityDb, usersDb, emailAuthDb } from "@saflib/identity-db";
import { describe, it, expect, beforeEach, assert } from "vitest";

describe("getEmailAuthByUserIds", () => {
  let dbKey: DbKey;

  beforeEach(() => {
    dbKey = identityDb.connect();
  });

  it("should return email auth info for specified user IDs", async () => {
    const now = new Date();
    now.setMilliseconds(0);
    const { result: user1 } = await usersDb.create(dbKey, {
      email: "user1@test.com",
    });
    assert(user1);
    const { result: user2 } = await usersDb.create(dbKey, {
      email: "user2@test.com",
    });
    assert(user2);
    const { result: user3 } = await usersDb.create(dbKey, {
      email: "user3@test.com",
    });
    assert(user3);

    const hash1 = Buffer.from("hash1");
    const auth1 = await emailAuthDb.create(dbKey, {
      userId: user1.id,
      email: user1.email,
      passwordHash: hash1,
    });

    const hash2 = Buffer.from("hash2");
    const auth2 = await emailAuthDb.create(dbKey, {
      userId: user2.id,
      email: user2.email,
      passwordHash: hash2,
    });

    // Request auth for user1 and user2
    const result = await emailAuthDb.getEmailAuthByUserIds(dbKey, [
      user1.id,
      user2.id,
    ]);

    expect(result).toHaveLength(2);

    // Check results (order isn't guaranteed, so check existence)
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          userId: auth1.userId,
          email: auth1.email,
          passwordHash: hash1,
        }),
        expect.objectContaining({
          userId: auth2.userId,
          email: auth2.email,
          passwordHash: hash2,
        }),
      ]),
    );
  });

  it("should return empty array if no email auth exists for the user IDs", async () => {
    const now = new Date();
    now.setMilliseconds(0);
    const { result: user1 } = await usersDb.create(dbKey, {
      email: "user1@test.com",
    });
    assert(user1);
    const result = await emailAuthDb.getEmailAuthByUserIds(dbKey, [user1.id]);

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it("should return empty array if input id list is empty", async () => {
    const result = await emailAuthDb.getEmailAuthByUserIds(dbKey, []);
    expect(result).toEqual([]);
  });

  it("should only return auth for users requested in the id list", async () => {
    const now = new Date();
    now.setMilliseconds(0);
    const { result: user1 } = await usersDb.create(dbKey, {
      email: "user1@test.com",
    });
    assert(user1);
    const { result: user2 } = await usersDb.create(dbKey, {
      email: "user2@test.com",
    });
    assert(user2);

    const hash1 = Buffer.from("hash1");
    const auth1 = await emailAuthDb.create(dbKey, {
      userId: user1.id,
      email: user1.email,
      passwordHash: hash1,
    });

    const hash2 = Buffer.from("hash2"); // Auth for user we don't request
    await emailAuthDb.create(dbKey, {
      userId: user2.id,
      email: user2.email,
      passwordHash: hash2,
    });

    const result = await emailAuthDb.getEmailAuthByUserIds(dbKey, [user1.id]);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      userId: auth1.userId,
      email: auth1.email,
      passwordHash: hash1,
    });
  });
});
