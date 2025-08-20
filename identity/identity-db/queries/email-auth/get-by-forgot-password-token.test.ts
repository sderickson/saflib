import { identityDbManager } from "../../instances.ts";
import type { DbKey } from "@saflib/drizzle-sqlite3";
import { identityDb } from "../../index.ts";
import { TokenNotFoundError } from "../../errors.ts";
import { describe, it, expect, beforeEach, assert } from "vitest";

describe("getByForgotPasswordToken", () => {
  let dbKey: DbKey;

  beforeEach(() => {
    dbKey = identityDbManager.connect();
  });

  it("should get email auth by forgot password token", async () => {
    const { result: user } = await identityDb.users.create(dbKey, {
      email: "test@example.com",
    });
    assert(user);

    const passwordHash = Buffer.from([1, 2, 3]);
    const token = "forgot-password-token";
    const now = new Date();
    now.setMilliseconds(0); // Round to seconds
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes from now

    await identityDb.emailAuth.create(dbKey, {
      userId: user.id,
      email: user.email,
      passwordHash,
      forgotPasswordToken: token,
      forgotPasswordTokenExpiresAt: expiresAt,
    });

    const { result: auth } =
      await identityDb.emailAuth.getByForgotPasswordToken(dbKey, token);
    expect(auth).toMatchObject({
      userId: user.id,
      email: user.email,
      forgotPasswordToken: token,
      forgotPasswordTokenExpiresAt: expiresAt,
    });
  });

  it("should throw TokenNotFoundError when token not found", async () => {
    const { error } = await identityDb.emailAuth.getByForgotPasswordToken(
      dbKey,
      "nonexistent-token",
    );
    expect(error).toBeInstanceOf(TokenNotFoundError);
  });
});
