import { identityDb, usersDb, emailAuthDb } from "@saflib/identity-db";
import type { DbKey } from "@saflib/drizzle";
import { EmailAuthNotFoundError } from "../../errors.ts";
import { describe, it, expect, beforeEach, assert } from "vitest";

describe("updateVerificationToken", () => {
  let dbKey: DbKey;

  beforeEach(() => {
    dbKey = identityDb.connect();
  });

  it("should update verification token", async () => {
    const { result: user } = await usersDb.create(dbKey, {
      email: "test@example.com",
    });
    assert(user);

    const passwordHash = Buffer.from([1, 2, 3]);
    await emailAuthDb.create(dbKey, {
      userId: user.id,
      email: user.email,
      passwordHash,
    });

    const now = new Date();
    now.setMilliseconds(0);
    const token = "new-verification-token";
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes from now

    const { result: updated } = await emailAuthDb.updateVerificationToken(
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
    const { error } = await emailAuthDb.updateVerificationToken(
      dbKey,
      "999",
      "token",
      new Date(),
    );
    expect(error).toBeInstanceOf(EmailAuthNotFoundError);
  });
});
