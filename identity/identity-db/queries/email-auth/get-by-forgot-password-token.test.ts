import { identityDb, usersDb, emailAuthDb } from "@saflib/identity-db";
import type { DbKey } from "@saflib/drizzle";
import { TokenNotFoundError } from "../../errors.ts";
import { describe, it, expect, beforeEach, assert } from "vitest";

describe("getByForgotPasswordToken", () => {
  let dbKey: DbKey;

  beforeEach(() => {
    dbKey = identityDb.connect();
  });

  it("should get email auth by forgot password token", async () => {
    const { result: user } = await usersDb.create(dbKey, {
      email: "test@example.com",
    });
    assert(user);

    const passwordHash = Buffer.from([1, 2, 3]);
    const token = "forgot-password-token";
    const now = new Date();
    now.setMilliseconds(0); // Round to seconds
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes from now

    await emailAuthDb.create(dbKey, {
      userId: user.id,
      email: user.email,
      passwordHash,
      forgotPasswordToken: token,
      forgotPasswordTokenExpiresAt: expiresAt,
    });

    const { result: auth } = await emailAuthDb.getByForgotPasswordToken(
      dbKey,
      token,
    );
    expect(auth).toMatchObject({
      userId: user.id,
      email: user.email,
      forgotPasswordToken: token,
      forgotPasswordTokenExpiresAt: expiresAt,
    });
  });

  it("should throw TokenNotFoundError when token not found", async () => {
    const { error } = await emailAuthDb.getByForgotPasswordToken(
      dbKey,
      "nonexistent-token",
    );
    expect(error).toBeInstanceOf(TokenNotFoundError);
  });
});
