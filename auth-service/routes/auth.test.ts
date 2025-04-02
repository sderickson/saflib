import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import session from "express-session";
import passport from "passport";
import { authRouter } from "./auth.ts";
import { setupPassport } from "../passport.ts";
import * as argon2 from "argon2";
import {
  recommendedErrorHandlers,
  recommendedPreMiddleware,
} from "@saflib/node-express";
import { AuthDB } from "@saflib/auth-db";

// Create a test app
const app = express();
app.use(recommendedPreMiddleware);

// Initialize database
const db = new AuthDB({ inMemory: true });

// Session configuration
app.use(
  session({
    secret: "test",
    resave: false,
    saveUninitialized: false,
  }),
);

// Initialize Passport
setupPassport(db);
app.use(passport.initialize());
app.use(passport.session());

// db injection
app.use((req, _, next) => {
  req.db = db;
  next();
});

app.use("/auth", authRouter);
app.use(recommendedErrorHandlers);

// Mock argon2
vi.mock("argon2", () => ({
  hash: vi.fn().mockResolvedValue("hashed-password"),
  verify: vi.fn().mockResolvedValue(true),
}));

describe("Auth Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /auth/reset-password", () => {
    it("should reset password successfully with valid token", async () => {
      const token = "valid-token";
      const newPassword = "new-password123";
      const userId = 1;

      const emailAuth = {
        userId,
        email: "test@example.com",
        passwordHash: Buffer.from("old-hash"),
        verifiedAt: null,
        verificationToken: null,
        verificationTokenExpiresAt: null,
        forgotPasswordToken: token,
        forgotPasswordTokenExpiresAt: new Date(Date.now() + 1000 * 60 * 15), // 15 minutes from now
      };

      vi.spyOn(db.emailAuth, "getByForgotPasswordToken").mockResolvedValue(
        emailAuth,
      );
      vi.spyOn(db.emailAuth, "updatePassword").mockResolvedValue(emailAuth);
      vi.spyOn(db.emailAuth, "clearForgotPasswordToken").mockResolvedValue(
        emailAuth,
      );

      const response = await request(app)
        .post("/auth/reset-password")
        .send({ token, newPassword });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });

      expect(db.emailAuth.getByForgotPasswordToken).toHaveBeenCalledWith(token);
      expect(db.emailAuth.updatePassword).toHaveBeenCalledWith(
        userId,
        expect.any(Buffer),
      );
      expect(db.emailAuth.clearForgotPasswordToken).toHaveBeenCalledWith(
        userId,
      );
      expect(argon2.hash).toHaveBeenCalledWith(newPassword);
    });

    it("should return 404 for expired token", async () => {
      const token = "expired-token";
      const newPassword = "new-password123";

      const emailAuth = {
        userId: 1,
        email: "test@example.com",
        passwordHash: Buffer.from("old-hash"),
        verifiedAt: null,
        verificationToken: null,
        verificationTokenExpiresAt: null,
        forgotPasswordToken: token,
        forgotPasswordTokenExpiresAt: new Date(Date.now() - 1000 * 60 * 15), // 15 minutes ago
      };

      vi.spyOn(db.emailAuth, "getByForgotPasswordToken").mockResolvedValue(
        emailAuth,
      );

      const response = await request(app)
        .post("/auth/reset-password")
        .send({ token, newPassword });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: "Invalid or expired token" });

      expect(db.emailAuth.getByForgotPasswordToken).toHaveBeenCalledWith(token);
      expect(db.emailAuth.updatePassword).not.toHaveBeenCalled();
      expect(db.emailAuth.clearForgotPasswordToken).not.toHaveBeenCalled();
    });

    it("should return 404 for invalid token", async () => {
      const token = "invalid-token";
      const newPassword = "new-password123";

      vi.spyOn(db.emailAuth, "getByForgotPasswordToken").mockRejectedValue(
        new db.emailAuth.TokenNotFoundError(),
      );

      const response = await request(app)
        .post("/auth/reset-password")
        .send({ token, newPassword });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: "Invalid or expired token" });

      expect(db.emailAuth.getByForgotPasswordToken).toHaveBeenCalledWith(token);
      expect(db.emailAuth.updatePassword).not.toHaveBeenCalled();
      expect(db.emailAuth.clearForgotPasswordToken).not.toHaveBeenCalled();
    });
  });

  describe("POST /auth/verify-email", () => {
    it("should verify email with valid token", async () => {
      const mockEmailAuth = {
        email: "test@example.com",
        userId: 1,
        passwordHash: "hashed-password",
        verifiedAt: null,
        verificationToken: "valid-token",
        verificationTokenExpiresAt: new Date(Date.now() + 1000 * 60 * 15), // 15 minutes from now
        forgotPasswordToken: null,
        forgotPasswordTokenExpiresAt: null,
      };

      const mockUser = {
        id: 1,
        email: "test@example.com",
        createdAt: new Date(),
        lastLoginAt: null,
      };

      vi.mocked(db.emailAuth.getByVerificationToken).mockResolvedValue(
        mockEmailAuth,
      );
      vi.mocked(db.emailAuth.verifyEmail).mockResolvedValue(mockEmailAuth);
      vi.mocked(db.users.getById).mockResolvedValue(mockUser);
      vi.mocked(db.permissions.getByUserId).mockResolvedValue([]);

      const response = await request(app)
        .post("/auth/verify-email")
        .query({ token: "valid-token" });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        id: 1,
        email: "test@example.com",
        scopes: [],
      });
      expect(db.emailAuth.verifyEmail).toHaveBeenCalledWith(1);
    });

    it("should return 400 for missing token", async () => {
      const response = await request(app).post("/auth/verify-email");

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: "Missing or invalid verification token",
      });
    });

    it("should return 404 for invalid token", async () => {
      vi.mocked(db.emailAuth.getByVerificationToken).mockResolvedValue({
        email: "test@example.com",
        userId: 1,
        passwordHash: "hashed-password",
        verifiedAt: null,
        verificationToken: null,
        verificationTokenExpiresAt: null,
        forgotPasswordToken: null,
        forgotPasswordTokenExpiresAt: null,
      });

      const response = await request(app)
        .post("/auth/verify-email")
        .query({ token: "invalid-token" });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        error: "Invalid or expired verification token",
      });
    });

    it("should return 400 for expired token", async () => {
      const mockEmailAuth = {
        email: "test@example.com",
        userId: 1,
        passwordHash: "hashed-password",
        verifiedAt: null,
        verificationToken: "expired-token",
        verificationTokenExpiresAt: new Date(Date.now() - 1000), // 1 second ago
        forgotPasswordToken: null,
        forgotPasswordTokenExpiresAt: null,
      };

      vi.mocked(db.emailAuth.getByVerificationToken).mockResolvedValue(
        mockEmailAuth,
      );

      const response = await request(app)
        .post("/auth/verify-email")
        .query({ token: "expired-token" });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: "Verification token has expired",
      });
    });
  });

  describe("POST /auth/resend-verification", () => {
    it("should resend verification email for logged in user", async () => {
      const mockEmailAuth = {
        email: "test@example.com",
        userId: 1,
        passwordHash: "hashed-password",
        verifiedAt: null,
        verificationToken: "new-token",
        verificationTokenExpiresAt: new Date(Date.now() + 1000 * 60 * 15),
        forgotPasswordToken: null,
        forgotPasswordTokenExpiresAt: null,
      };

      vi.mocked(db.emailAuth.updateVerificationToken).mockResolvedValue(
        mockEmailAuth,
      );

      const response = await request(app)
        .post("/auth/resend-verification")
        .set("x-user-id", "1")
        .set("x-user-email", "test@example.com");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: "Verification email sent",
      });
      expect(db.emailAuth.updateVerificationToken).toHaveBeenCalledWith(
        1,
        expect.any(String),
        expect.any(Date),
      );
    });

    it("should return 401 for unauthenticated user", async () => {
      const response = await request(app).post("/auth/resend-verification");

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        error: "User must be logged in",
      });
    });
  });
});
