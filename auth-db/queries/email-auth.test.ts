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

  describe("updatePasswordHash", () => {
    it("should update password hash", async () => {
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

      const newPasswordHash = Buffer.from([4, 5, 6]);
      const updated = await db.emailAuth.updatePasswordHash(
        user.id,
        newPasswordHash,
      );
      expect(updated).toMatchObject({
        passwordHash: newPasswordHash,
      });
    });

    it("should throw EmailAuthNotFoundError when user not found", async () => {
      await expect(
        db.emailAuth.updatePasswordHash(999, Buffer.from([4, 5, 6])),
      ).rejects.toThrow(EmailAuthNotFoundError);
    });
  });

  describe("getByForgotPasswordToken", () => {
    it("should get email auth by forgot password token", async () => {
      const user = await db.users.create({
        email: "test@example.com",
        createdAt: new Date(),
      });

      const passwordHash = Buffer.from([1, 2, 3]);
      const token = "forgot-password-token";
      const now = new Date();
      now.setMilliseconds(0); // Round to seconds
      const expiresAt = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes from now

      await db.emailAuth.create({
        userId: user.id,
        email: user.email,
        passwordHash,
        forgotPasswordToken: token,
        forgotPasswordTokenExpiresAt: expiresAt,
      });

      const auth = await db.emailAuth.getByForgotPasswordToken(token);
      expect(auth).toMatchObject({
        userId: user.id,
        email: user.email,
        forgotPasswordToken: token,
        forgotPasswordTokenExpiresAt: expiresAt,
      });
    });

    it("should throw TokenNotFoundError when token not found", async () => {
      await expect(
        db.emailAuth.getByForgotPasswordToken("nonexistent-token"),
      ).rejects.toThrow(db.emailAuth.TokenNotFoundError);
    });
  });

  describe("updatePassword", () => {
    it("should update password", async () => {
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

      const newPasswordHash = Buffer.from([4, 5, 6]);
      const updated = await db.emailAuth.updatePassword(
        user.id,
        newPasswordHash,
      );
      expect(updated).toMatchObject({
        passwordHash: newPasswordHash,
      });
    });

    it("should throw EmailAuthNotFoundError when user not found", async () => {
      await expect(
        db.emailAuth.updatePassword(999, Buffer.from([4, 5, 6])),
      ).rejects.toThrow(EmailAuthNotFoundError);
    });
  });

  describe("clearForgotPasswordToken", () => {
    it("should clear forgot password token", async () => {
      const user = await db.users.create({
        email: "test@example.com",
        createdAt: new Date(),
      });

      const passwordHash = Buffer.from([1, 2, 3]);
      const token = "forgot-password-token";
      const now = new Date();
      now.setMilliseconds(0); // Round to seconds
      const expiresAt = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes from now

      await db.emailAuth.create({
        userId: user.id,
        email: user.email,
        passwordHash,
        forgotPasswordToken: token,
        forgotPasswordTokenExpiresAt: expiresAt,
      });

      const updated = await db.emailAuth.clearForgotPasswordToken(user.id);
      expect(updated).toMatchObject({
        forgotPasswordToken: null,
        forgotPasswordTokenExpiresAt: null,
      });
    });

    it("should throw EmailAuthNotFoundError when user not found", async () => {
      await expect(db.emailAuth.clearForgotPasswordToken(999)).rejects.toThrow(
        EmailAuthNotFoundError,
      );
    });
  });

  describe("verifyEmail", () => {
    it("should verify email and clear verification token", async () => {
      const user = await db.users.create({
        email: "test@example.com",
        createdAt: new Date(),
      });

      const passwordHash = Buffer.from([1, 2, 3]);
      const token = "verification-token";
      const now = new Date();
      now.setMilliseconds(0);
      const expiresAt = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes from now

      await db.emailAuth.create({
        userId: user.id,
        email: user.email,
        passwordHash,
        verificationToken: token,
        verificationTokenExpiresAt: expiresAt,
      });

      const updated = await db.emailAuth.verifyEmail(user.id);
      expect(updated).toMatchObject({
        verifiedAt: expect.any(Date),
        verificationToken: null,
        verificationTokenExpiresAt: null,
      });
    });

    it("should throw EmailAuthNotFoundError when user not found", async () => {
      await expect(db.emailAuth.verifyEmail(999)).rejects.toThrow(
        EmailAuthNotFoundError,
      );
    });
  });

  describe("getByVerificationToken", () => {
    it("should get email auth by verification token", async () => {
      const user = await db.users.create({
        email: "test@example.com",
        createdAt: new Date(),
      });

      const passwordHash = Buffer.from([1, 2, 3]);
      const token = "verification-token";
      const now = new Date();
      now.setMilliseconds(0);
      const expiresAt = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes from now

      await db.emailAuth.create({
        userId: user.id,
        email: user.email,
        passwordHash,
        verificationToken: token,
        verificationTokenExpiresAt: expiresAt,
      });

      const auth = await db.emailAuth.getByVerificationToken(token);
      expect(auth).toMatchObject({
        userId: user.id,
        email: user.email,
        verificationToken: token,
        verificationTokenExpiresAt: expiresAt,
      });
    });

    it("should throw VerificationTokenNotFoundError when token not found", async () => {
      await expect(
        db.emailAuth.getByVerificationToken("nonexistent-token"),
      ).rejects.toThrow(db.emailAuth.VerificationTokenNotFoundError);
    });
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
