import { describe, it, expect, beforeEach, assert } from "vitest";
import { authDbManager } from "../../instances.ts";
import type { DbKey } from "@saflib/drizzle-sqlite3";
import { authDb } from "../../index.ts";
import { EmailAuthNotFoundError } from "../../errors.ts";

describe("updateVerification", () => {
  let dbKey: DbKey;

  beforeEach(() => {
    dbKey = authDbManager.connect();
  });

  it("should update verification details", async () => {
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

    const now = new Date();
    const token = "verification-token";
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    expiresAt.setMilliseconds(0);

    const { result: updated } = await authDb.emailAuth.updateVerification(
      dbKey,
      user.id,
      token,
      expiresAt,
      null,
    );
    expect(updated).toMatchObject({
      verificationToken: token,
      verificationTokenExpiresAt: expiresAt,
      verifiedAt: null,
    });
  });

  it("should throw EmailAuthNotFoundError when user not found", async () => {
    const { error } = await authDb.emailAuth.updateVerification(
      dbKey,
      999,
      "token",
      new Date(),
      null,
    );
    expect(error).toBeInstanceOf(EmailAuthNotFoundError);
  });
});
