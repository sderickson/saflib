import { describe, it, expect, beforeEach } from "vitest";
import { AuthDB } from "../instance.ts";
import { EmailAuthNotFoundError } from "./email-auth.ts";

describe("email-auth queries", () => {
  let db: AuthDB;

  // Create a new database instance before each test
  beforeEach(async () => {
    db = new AuthDB({ inMemory: true });
    await db.emailAuth.deleteAll();
    await db.users.deleteAll();
  });

  describe("updateVerificationToken", () => {
    it("should update verification token", async () => {
      const user = await db.users.create({
        email: "test@example.com",
        createdAt: new Date(),
      });

      const passwordHash = Buffer.from([1, 2, 3]);
      await db.emailAuth.create({
        userId: user.id,
        email: user.email,
        passwordHash,
      });

      const now = new Date();
      now.setMilliseconds(0);
      const token = "new-verification-token";
      const expiresAt = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes from now

      const updated = await db.emailAuth.updateVerificationToken(
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
      await expect(
        db.emailAuth.updateVerificationToken(999, "token", new Date()),
      ).rejects.toThrow(EmailAuthNotFoundError);
    });
  });
});
