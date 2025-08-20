import { identityDbManager } from "../../instances.ts";
import { describe, it, expect, beforeEach } from "vitest";
import { identityDb } from "../../index.ts";
import type { DbKey } from "@saflib/drizzle-sqlite3";
describe("getAll", () => {
  let dbKey: DbKey;

  beforeEach(() => {
    dbKey = identityDbManager.connect();
  });

  it("should return all users", async () => {
    const testUsers = [
      {
        name: "Test User 1",
        email: "test1@example.com",
        createdAt: new Date(),
      },
      {
        name: "Test User 2",
        email: "test2@example.com",
        createdAt: new Date(),
      },
    ];

    await Promise.all(
      testUsers.map((user) => identityDb.users.create(dbKey, user)),
    );

    const result = await identityDb.users.getAll(dbKey);
    expect(result).toHaveLength(2);
    expect(result.map((u) => u.email)).toEqual(
      expect.arrayContaining(testUsers.map((u) => u.email)),
    );
  });

  it("should return empty array when no users exist", async () => {
    const result = await identityDb.users.getAll(dbKey);
    expect(result).toEqual([]);
  });
});
