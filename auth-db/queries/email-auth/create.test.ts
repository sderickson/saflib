import { beforeEach, describe, expect, it } from "vitest";
import { authDbManager } from "../../instances.ts";
import type { DbKey } from "@saflib/drizzle-sqlite3";
import { authDb } from "../../index.ts";

describe("create email auth", () => {
  let dbKey: DbKey;

  beforeEach(async () => {
    dbKey = authDbManager.connect();
  });

  it("should create email auth for a user", async () => {
    const user = await authDb.users.create(dbKey, {
      email: "test@example.com",
      createdAt: new Date(),
    });

    const passwordHash = Buffer.from([1, 2, 3]);
    const auth = await db.emailAuth.create({
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
