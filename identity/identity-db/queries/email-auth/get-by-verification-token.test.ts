import { identityDbManager } from "../../instances.ts";
import type { DbKey } from "@saflib/drizzle-sqlite3";
import { identityDb } from "../../index.ts";
import { VerificationTokenNotFoundError } from "../../errors.ts";
import { describe, it, expect, beforeEach, assert } from "vitest";

describe("getByVerificationToken", () => {
  let dbKey: DbKey;

  beforeEach(() => {
    dbKey = identityDbManager.connect();
  });

  it("should get email auth by verification token", async () => {
    const { result: user } = await identityDb.users.create(dbKey, {
      email: "test@example.com",
    });
    assert(user);
    const passwordHash = Buffer.from([1, 2, 3]);
    const token = "verification-token";
    const now = new Date();
    now.setMilliseconds(0);
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes from now

    await identityDb.emailAuth.create(dbKey, {
      userId: user.id,
      email: user.email,
      passwordHash,
      verificationToken: token,
      verificationTokenExpiresAt: expiresAt,
    });

    const { result: auth } = await identityDb.emailAuth.getByVerificationToken(
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
    const { error } = await identityDb.emailAuth.getByVerificationToken(
      dbKey,
      "nonexistent-token",
    );
    expect(error).toBeInstanceOf(VerificationTokenNotFoundError);
  });
});
