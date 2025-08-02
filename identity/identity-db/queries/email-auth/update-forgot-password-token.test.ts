import { authDbManager } from "../../instances.ts";
import type { DbKey } from "@saflib/drizzle-sqlite3";
import { authDb } from "../../index.ts";
import { EmailAuthNotFoundError } from "../../errors.ts";
import { describe, it, expect, beforeEach, assert } from "vitest";

describe("updateForgotPasswordToken", () => {
  let dbKey: DbKey;

  beforeEach(() => {
    dbKey = authDbManager.connect();
  });

  it("should update forgot password token", async () => {
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
    const token = "forgot-password-token";
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    expiresAt.setMilliseconds(0);

    const { result: updated } =
      await authDb.emailAuth.updateForgotPasswordToken(
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
    const { error } = await authDb.emailAuth.updateForgotPasswordToken(
      dbKey,
      999,
      "token",
      new Date(),
    );
    expect(error).toBeInstanceOf(EmailAuthNotFoundError);
  });
});
