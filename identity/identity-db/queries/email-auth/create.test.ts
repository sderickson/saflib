import { beforeEach, describe, expect, it, assert } from "vitest";
import { identityDbManager } from "../../instances.ts";
import type { DbKey } from "@saflib/drizzle-sqlite3";
import { identityDb } from "../../index.ts";

describe("create email auth", () => {
  let dbKey: DbKey;

  beforeEach(async () => {
    dbKey = identityDbManager.connect();
  });

  it("should create email auth for a user", async () => {
    const { result: user } = await identityDb.users.create(dbKey, {
      email: "test@example.com",
    });
    assert(user);

    const passwordHash = Buffer.from([1, 2, 3]);
    const auth = await identityDb.emailAuth.create(dbKey, {
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
