import { authDbManager } from "../../instances.ts";
import type { DbKey } from "@saflib/drizzle-sqlite3";
import { authDb } from "../../index.ts";
import { EmailAuthNotFoundError } from "../../errors.ts";
import { describe, it, expect, beforeEach, assert } from "vitest";

describe("updateEmail", () => {
  let dbKey: DbKey;

  beforeEach(() => {
    dbKey = authDbManager.connect();
  });

  it("should update email and clear verification data", async () => {
    const { result: user } = await authDb.users.create(dbKey, {
      email: "test@example.com",
    });
    assert(user);

    // Create email auth with verification data
    const now = new Date();
    now.setMilliseconds(0);
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);

    const passwordHash = Buffer.from([1, 2, 3]);
    await authDb.emailAuth.create(dbKey, {
      userId: user.id,
      email: user.email,
      passwordHash,
      verificationToken: "test-token",
      verificationTokenExpiresAt: expiresAt,
      verifiedAt: now,
    });

    // Update email
    const newEmail = "newemail@example.com";
    const { result: updated } = await authDb.emailAuth.updateEmail(
      dbKey,
      user.id,
      newEmail,
    );
    assert(updated);

    expect(updated.emailAuth).toMatchObject({
      email: newEmail,
      verificationToken: null,
      verificationTokenExpiresAt: null,
      verifiedAt: null,
    });

    // Verify user table was also updated
    const { result: updatedUser } = await authDb.users.getById(dbKey, user.id);
    assert(updatedUser);
    expect(updatedUser).toMatchObject({
      email: newEmail,
      emailVerified: false,
    });
  });

  it("should return EmailAuthNotFoundError when user not found", async () => {
    const { error } = await authDb.emailAuth.updateEmail(
      dbKey,
      999,
      "new@example.com",
    );
    expect(error).toBeInstanceOf(EmailAuthNotFoundError);
  });
});
