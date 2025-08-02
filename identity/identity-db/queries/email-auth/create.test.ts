import { beforeEach, describe, expect, it, assert } from "vitest";
import { authDbManager } from "../../instances.ts";
import type { DbKey } from "@saflib/drizzle-sqlite3";
import { authDb } from "../../index.ts";

describe("create email auth", () => {
  let dbKey: DbKey;

  beforeEach(async () => {
    dbKey = authDbManager.connect();
  });

  it("should create email auth for a user", async () => {
    const { result: user } = await authDb.users.create(dbKey, {
      email: "test@example.com",
    });
    assert(user);

    const passwordHash = Buffer.from([1, 2, 3]);
    const auth = await authDb.emailAuth.create(dbKey, {
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
