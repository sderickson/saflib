import { identityDb, usersDb, emailAuthDb } from "@saflib/identity-db";
import type { DbKey } from "@saflib/drizzle";
import { VerificationTokenNotFoundError } from "../../errors.ts";
import { describe, it, expect, beforeEach, assert } from "vitest";

describe("getByVerificationToken", () => {
  let dbKey: DbKey;

  beforeEach(() => {
    dbKey = identityDb.connect();
  });

  it("should get email auth by verification token", async () => {
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

    const { result: auth } = await emailAuthDb.getByVerificationToken(
      dbKey,
      token,
    );
    expect(auth).toMatchObject({
      userId: user.id,
      email: user.email,
      verificationToken: token,
      verificationTokenExpiresAt: expiresAt,
    });
  });

  it("should throw VerificationTokenNotFoundError when token not found", async () => {
    const { error } = await emailAuthDb.getByVerificationToken(
      dbKey,
      "nonexistent-token",
    );
    expect(error).toBeInstanceOf(VerificationTokenNotFoundError);
  });
});
