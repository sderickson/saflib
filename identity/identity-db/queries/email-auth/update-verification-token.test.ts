import { authDbManager } from "../../instances.ts";
import type { DbKey } from "@saflib/drizzle-sqlite3";
import { authDb } from "../../index.ts";
import { EmailAuthNotFoundError } from "../../errors.ts";
import { describe, it, expect, beforeEach, assert } from "vitest";

describe("updateVerificationToken", () => {
  let dbKey: DbKey;

  beforeEach(() => {
    dbKey = authDbManager.connect();
  });

  it("should update verification token", async () => {
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
    now.setMilliseconds(0);
    const token = "new-verification-token";
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes from now

    const { result: updated } = await authDb.emailAuth.updateVerificationToken(
      dbKey,
      user.id,
      token,
      expiresAt,
    );
    expect(updated).toMatchObject({
      verificationToken: token,
      verificationTokenExpiresAt: expiresAt,
    });
  });

  it("should throw EmailAuthNotFoundError when user not found", async () => {
    const { error } = await authDb.emailAuth.updateVerificationToken(
      dbKey,
      999,
      "token",
      new Date(),
    );
    expect(error).toBeInstanceOf(EmailAuthNotFoundError);
  });
});
