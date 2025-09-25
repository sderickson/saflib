import type { DbKey } from "@saflib/drizzle";
import {
  identityDb,
  emailAuthDb,
  usersDb,
  EmailAuthNotFoundError,
} from "@saflib/identity-db";
import { describe, it, expect, beforeEach, assert } from "vitest";

describe("verifyEmail", () => {
  let dbKey: DbKey;

  beforeEach(() => {
    dbKey = identityDb.connect();
  });

  it("should verify email and clear verification token", async () => {
    const { result: user } = await usersDb.create(dbKey, {
      email: "test@example.com",
    });
    assert(user);

    const passwordHash = Buffer.from([1, 2, 3]);
    const token = "verification-token";
    const now = new Date();
    now.setMilliseconds(0);
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes from now

    await emailAuthDb.create(dbKey, {
      userId: user.id,
      email: user.email,
      passwordHash,
      verificationToken: token,
      verificationTokenExpiresAt: expiresAt,
    });

    const { result: updated } = await emailAuthDb.verifyEmail(dbKey, user.id);
    expect(updated).toMatchObject({
      verifiedAt: expect.any(Date),
      verificationToken: null,
      verificationTokenExpiresAt: null,
    });
  });

  it("should throw EmailAuthNotFoundError when user not found", async () => {
    const { error } = await emailAuthDb.verifyEmail(dbKey, "999");
    expect(error).toBeInstanceOf(EmailAuthNotFoundError);
  });
});
