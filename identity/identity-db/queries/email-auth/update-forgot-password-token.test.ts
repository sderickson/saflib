import { identityDb, usersDb, emailAuthDb } from "@saflib/identity-db";
import type { DbKey } from "@saflib/drizzle";
import { EmailAuthNotFoundError } from "../../errors.ts";
import { describe, it, expect, beforeEach, assert } from "vitest";

describe("updateForgotPasswordToken", () => {
  let dbKey: DbKey;

  beforeEach(() => {
    dbKey = identityDb.connect();
  });

  it("should update forgot password token", async () => {
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
    const token = "forgot-password-token";
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    expiresAt.setMilliseconds(0);

    const { result: updated } = await emailAuthDb.updateForgotPasswordToken(
      dbKey,
      user.id,
      token,
      expiresAt,
    );
    expect(updated).toMatchObject({
      forgotPasswordToken: token,
      forgotPasswordTokenExpiresAt: expiresAt,
    });
  });

  it("should throw EmailAuthNotFoundError when user not found", async () => {
    const { error } = await emailAuthDb.updateForgotPasswordToken(
      dbKey,
      999,
      "token",
      new Date(),
    );
    expect(error).toBeInstanceOf(EmailAuthNotFoundError);
  });
});
