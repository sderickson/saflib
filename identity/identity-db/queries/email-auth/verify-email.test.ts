import { authDbManager } from "../../instances.ts";
import type { DbKey } from "@saflib/drizzle-sqlite3";
import { authDb } from "../../index.ts";
import { EmailAuthNotFoundError } from "../../errors.ts";
import { describe, it, expect, beforeEach, assert } from "vitest";

describe("verifyEmail", () => {
  let dbKey: DbKey;

  beforeEach(() => {
    dbKey = authDbManager.connect();
  });

  it("should verify email and clear verification token", async () => {
    const { result: user } = await authDb.users.create(dbKey, {
      email: "test@example.com",
    });
    assert(user);

    const passwordHash = Buffer.from([1, 2, 3]);
    const token = "verification-token";
    const now = new Date();
    now.setMilliseconds(0);
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes from now

    await authDb.emailAuth.create(dbKey, {
      userId: user.id,
      email: user.email,
      passwordHash,
      verificationToken: token,
      verificationTokenExpiresAt: expiresAt,
    });

    const { result: updated } = await authDb.emailAuth.verifyEmail(
      dbKey,
      user.id,
    );
    expect(updated).toMatchObject({
      verifiedAt: expect.any(Date),
      verificationToken: null,
      verificationTokenExpiresAt: null,
    });
  });

  it("should throw EmailAuthNotFoundError when user not found", async () => {
    const { error } = await authDb.emailAuth.verifyEmail(dbKey, 999);
    expect(error).toBeInstanceOf(EmailAuthNotFoundError);
  });
});
