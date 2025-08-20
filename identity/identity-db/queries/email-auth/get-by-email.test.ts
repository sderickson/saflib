import { identityDbManager } from "../../instances.ts";
import type { DbKey } from "@saflib/drizzle-sqlite3";
import { identityDb } from "../../index.ts";
import { EmailAuthNotFoundError } from "../../errors.ts";
import { describe, it, expect, beforeEach, assert } from "vitest";

describe("getByEmail", () => {
  let dbKey: DbKey;

  beforeEach(() => {
    dbKey = identityDbManager.connect();
  });
  it("should get email auth by email", async () => {
    const { result: user } = await identityDb.users.create(dbKey, {
      email: "test@example.com",
    });
    assert(user);

    const passwordHash = Buffer.from([1, 2, 3]);
    const created = await identityDb.emailAuth.create(dbKey, {
      userId: user.id,
      email: user.email,
      passwordHash,
    });

    const { result: auth } = await identityDb.emailAuth.getByEmail(
      dbKey,
      user.email,
    );
    expect(auth).toEqual(created);
  });

  it("should throw EmailAuthNotFoundError when email not found", async () => {
    const { error } = await identityDb.emailAuth.getByEmail(
      dbKey,
      "nonexistent@example.com",
    );
    expect(error).toBeInstanceOf(EmailAuthNotFoundError);
  });
});
