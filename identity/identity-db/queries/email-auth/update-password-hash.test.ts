import { authDbManager } from "../../instances.ts";
import type { DbKey } from "@saflib/drizzle-sqlite3";
import { authDb } from "../../index.ts";
import { EmailAuthNotFoundError } from "../../errors.ts";
import { describe, it, expect, beforeEach, assert } from "vitest";

describe("updatePasswordHash", () => {
  let dbKey: DbKey;

  beforeEach(() => {
    dbKey = authDbManager.connect();
  });

  it("should update password hash", async () => {
    const { result: user } = await authDb.users.create(dbKey, {
      email: "test@example.com",
    });
    assert(user);

    const passwordHash = Buffer.from([1, 2, 3]);
    await authDb.emailAuth.create(dbKey, {
      userId: user.id,
      email: user.email,
      passwordHash,
    });

    const newPasswordHash = Buffer.from([4, 5, 6]);
    const { result: updated } = await authDb.emailAuth.updatePasswordHash(
      dbKey,
      user.id,
      newPasswordHash,
    );
    expect(updated).toMatchObject({
      passwordHash: newPasswordHash,
    });
  });

  it("should throw EmailAuthNotFoundError when user not found", async () => {
    const { error } = await authDb.emailAuth.updatePasswordHash(
      dbKey,
      999,
      Buffer.from([4, 5, 6]),
    );
    expect(error).toBeInstanceOf(EmailAuthNotFoundError);
  });
});
