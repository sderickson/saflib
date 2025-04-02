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

  describe("POST /auth/register", () => {
    it("should register a new user successfully", async () => {
      const userData = {
        email: "test@example.com",
        password: "password123",
      };

      const createdUser = {
        id: 1,
        email: userData.email,
        createdAt: new Date(),
        lastLoginAt: null,
      };

      vi.spyOn(db.users, "create").mockResolvedValue(createdUser);
      vi.spyOn(db.emailAuth, "create").mockResolvedValue({
        userId: createdUser.id,
        email: createdUser.email,
        passwordHash: Buffer.from("hashed-password"),
        verifiedAt: null,
        verificationToken: null,
        verificationTokenExpiresAt: null,
        forgotPasswordToken: null,
        forgotPasswordTokenExpiresAt: null,
      });

      const response = await request(app).post("/auth/register").send(userData);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        email: userData.email,
        id: createdUser.id,
      });

      expect(db.users.create).toHaveBeenCalledWith({
        email: userData.email,
        createdAt: expect.any(Date),
      });

      expect(db.emailAuth.create).toHaveBeenCalledWith({
        userId: createdUser.id,
        email: userData.email,
        passwordHash: expect.any(Buffer),
      });

      expect(argon2.hash).toHaveBeenCalledWith(userData.password);
    });

    it("should return 409 for duplicate email", async () => {
      const userData = {
        email: "test@example.com",
        password: "password123",
      };

      vi.spyOn(db.users, "create").mockRejectedValue(
        new db.users.EmailConflictError(),
      );

      const response = await request(app).post("/auth/register").send(userData);

      expect(response.status).toBe(409);
      expect(response.body).toEqual({ message: "Email already exists" });
    });

    it("should auto-assign admin permission for test environment users with admin.*@email.com pattern", async () => {
      const userData = {
        email: "admin.test@email.com",
        password: "password123",
      };

      const createdUser = {
        id: 1,
        email: userData.email,
        createdAt: new Date(),
        lastLoginAt: null,
      };

      vi.spyOn(db.users, "create").mockResolvedValue(createdUser);
      vi.spyOn(db.emailAuth, "create").mockResolvedValue({
        userId: createdUser.id,
        email: createdUser.email,
        passwordHash: Buffer.from("hashed-password"),
        verifiedAt: null,
        verificationToken: null,
        verificationTokenExpiresAt: null,
        forgotPasswordToken: null,
        forgotPasswordTokenExpiresAt: null,
      });
      vi.spyOn(db.permissions, "add").mockResolvedValue({
        lastInsertRowid: 1,
        changes: 1,
      });

      // Set ALLOW_ADMIN_SIGNUPS to true
      const originalEnv = process.env.ALLOW_ADMIN_SIGNUPS;
      process.env.ALLOW_ADMIN_SIGNUPS = "true";

      const response = await request(app).post("/auth/register").send(userData);

      // Restore original ALLOW_ADMIN_SIGNUPS
      process.env.ALLOW_ADMIN_SIGNUPS = originalEnv;

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        email: userData.email,
        id: createdUser.id,
      });
      expect(db.permissions.add).toHaveBeenCalledWith(
        createdUser.id,
        "admin",
        createdUser.id,
      );
    });

    it("should not auto-assign admin permission for non-admin email pattern", async () => {
      const userData = {
        email: "test@email.com",
        password: "password123",
      };

      const createdUser = {
        id: 1,
        email: userData.email,
        createdAt: new Date(),
        lastLoginAt: null,
      };

      vi.spyOn(db.users, "create").mockResolvedValue(createdUser);
      vi.spyOn(db.emailAuth, "create").mockResolvedValue({
        userId: createdUser.id,
        email: createdUser.email,
        passwordHash: Buffer.from("hashed-password"),
        verifiedAt: null,
        verificationToken: null,
        verificationTokenExpiresAt: null,
        forgotPasswordToken: null,
        forgotPasswordTokenExpiresAt: null,
      });
      vi.spyOn(db.permissions, "add").mockResolvedValue({
        lastInsertRowid: 1,
        changes: 1,
      });

      // Set ALLOW_ADMIN_SIGNUPS to true
      const originalEnv = process.env.ALLOW_ADMIN_SIGNUPS;
      process.env.ALLOW_ADMIN_SIGNUPS = "true";

      const response = await request(app).post("/auth/register").send(userData);

      // Restore original ALLOW_ADMIN_SIGNUPS
      process.env.ALLOW_ADMIN_SIGNUPS = originalEnv;

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        email: userData.email,
        id: createdUser.id,
      });
      expect(db.permissions.add).not.toHaveBeenCalled();
    });

    it("should not auto-assign admin permission when ALLOW_ADMIN_SIGNUPS is not true", async () => {
      const userData = {
        email: "admin.test@email.com",
        password: "password123",
      };

      const createdUser = {
        id: 1,
        email: userData.email,
        createdAt: new Date(),
        lastLoginAt: null,
      };

      vi.spyOn(db.users, "create").mockResolvedValue(createdUser);
      vi.spyOn(db.emailAuth, "create").mockResolvedValue({
        userId: createdUser.id,
        email: createdUser.email,
        passwordHash: Buffer.from("hashed-password"),
        verifiedAt: null,
        verificationToken: null,
        verificationTokenExpiresAt: null,
        forgotPasswordToken: null,
        forgotPasswordTokenExpiresAt: null,
      });
      vi.spyOn(db.permissions, "add").mockResolvedValue({
        lastInsertRowid: 1,
        changes: 1,
      });

      // Set ALLOW_ADMIN_SIGNUPS to false
      const originalEnv = process.env.ALLOW_ADMIN_SIGNUPS;
      process.env.ALLOW_ADMIN_SIGNUPS = "false";

      const response = await request(app).post("/auth/register").send(userData);

      // Restore original ALLOW_ADMIN_SIGNUPS
      process.env.ALLOW_ADMIN_SIGNUPS = originalEnv;

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        email: userData.email,
        id: createdUser.id,
      });
      expect(db.permissions.add).not.toHaveBeenCalled();
    });
  });

  describe("POST /auth/login", () => {
    it("should login successfully", async () => {
      const userData = {
        email: "test@example.com",
        password: "password123",
      };

      const user = {
        id: 1,
        email: userData.email,
        createdAt: new Date(),
        lastLoginAt: null,
      };

      const authData = {
        userId: user.id,
        email: user.email,
        passwordHash: Buffer.from("hashed-password"),
        verifiedAt: null,
        verificationToken: null,
        verificationTokenExpiresAt: null,
        forgotPasswordToken: null,
        forgotPasswordTokenExpiresAt: null,
      };

      vi.spyOn(db.users, "getByEmail").mockResolvedValue(user);
      vi.spyOn(db.emailAuth, "getByEmail").mockResolvedValue(authData);
      vi.spyOn(db.users, "updateLastLogin").mockResolvedValue({
        ...user,
        lastLoginAt: new Date(),
      });
      vi.spyOn(db.users, "getById").mockResolvedValue(user);

      const response = await request(app).post("/auth/login").send(userData);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        email: userData.email,
        id: user.id,
      });
      expect(response.header["set-cookie"]).toBeDefined();

      expect(db.users.getByEmail).toHaveBeenCalledWith(userData.email);
      expect(db.emailAuth.getByEmail).toHaveBeenCalledWith(userData.email);
      expect(argon2.verify).toHaveBeenCalled();
      expect(db.users.updateLastLogin).toHaveBeenCalledWith(user.id);
    });

    it("should return 401 for invalid credentials", async () => {
      const userData = {
        email: "test@example.com",
        password: "wrong",
      };

      vi.spyOn(db.users, "getByEmail").mockRejectedValue(
        new db.users.UserNotFoundError(),
      );

      const response = await request(app).post("/auth/login").send(userData);

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ message: "Invalid credentials" });
    });

    it("should return 401 for wrong password", async () => {
      const userData = {
        email: "test@example.com",
        password: "wrong",
      };

      const user = {
        id: 1,
        email: userData.email,
        createdAt: new Date(),
        lastLoginAt: null,
      };

      const authData = {
        userId: user.id,
        email: user.email,
        passwordHash: Buffer.from("hashed-password"),
        verifiedAt: null,
        verificationToken: null,
        verificationTokenExpiresAt: null,
        forgotPasswordToken: null,
        forgotPasswordTokenExpiresAt: null,
      };

      vi.spyOn(db.users, "getByEmail").mockResolvedValue(user);
      vi.spyOn(db.emailAuth, "getByEmail").mockResolvedValue(authData);
      vi.spyOn(argon2, "verify").mockResolvedValue(false);

      const response = await request(app).post("/auth/login").send(userData);

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ message: "Invalid credentials" });
    });
  });

  describe("POST /auth/logout", () => {
    it("should logout successfully", async () => {
      // First login
      const userData = {
        email: "test@example.com",
        password: "password123",
      };

      const user = {
        id: 1,
        email: userData.email,
        createdAt: new Date(),
        lastLoginAt: null,
      };

      vi.spyOn(db.users, "getByEmail").mockResolvedValue(user);
      vi.spyOn(db.emailAuth, "getByEmail").mockResolvedValue({
        userId: user.id,
        email: user.email,
        passwordHash: Buffer.from("hashed-password"),
        verifiedAt: null,
        verificationToken: null,
        verificationTokenExpiresAt: null,
        forgotPasswordToken: null,
        forgotPasswordTokenExpiresAt: null,
      });

      // Login first
      await request(app).post("/auth/login").send(userData);

      // Then logout
      const response = await request(app).post("/auth/logout");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({});
    });
  });

  describe("GET /auth/verify", () => {
    it("should return 401 when not authenticated", async () => {
      const response = await request(app).get("/auth/verify");

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ message: "Unauthorized!" });
    });

    it("should return user ID and email when authenticated", async () => {
      // Setup test user
      const userData = {
        email: "test@example.com",
        password: "password123",
      };

      const user = {
        id: 1,
        email: userData.email,
        createdAt: new Date(),
        lastLoginAt: null,
      };

      // Mock database responses
      vi.spyOn(db.users, "getByEmail").mockResolvedValue(user);
      vi.spyOn(db.emailAuth, "getByEmail").mockResolvedValue({
        userId: user.id,
        email: user.email,
        passwordHash: Buffer.from("hashed-password"),
        verifiedAt: null,
        verificationToken: null,
        verificationTokenExpiresAt: null,
        forgotPasswordToken: null,
        forgotPasswordTokenExpiresAt: null,
      });
      vi.spyOn(db.users, "getById").mockResolvedValue(user);
      vi.spyOn(db.users, "updateLastLogin").mockResolvedValue({
        ...user,
        lastLoginAt: new Date(),
      });
      vi.spyOn(argon2, "verify").mockResolvedValue(true);

      // Use agent to maintain cookies between requests
      const agent = request.agent(app);

      // Login first to establish session
      const loginResponse = await agent.post("/auth/login").send(userData);

      expect(loginResponse.status).toBe(200);

      // Then verify authentication
      const verifyResponse = await agent.get("/auth/verify");

      expect(verifyResponse.status).toBe(200);
      expect(verifyResponse.body).toEqual({
        id: user.id,
        email: user.email,
        scopes: ["none"],
      });
      expect(verifyResponse.header["x-user-id"]).toBe(user.id.toString());
      expect(verifyResponse.header["x-user-email"]).toBe(user.email);
      expect(verifyResponse.header["x-user-scopes"]).toBe("none");
    });

    it("should handle health check requests", async () => {
      const response = await request(app)
        .get("/auth/verify")
        .set("x-forwarded-uri", "/health");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({});
    });

    it("should handle OPTIONS requests", async () => {
      const response = await request(app)
        .get("/auth/verify")
        .set("x-forwarded-method", "OPTIONS");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({});
    });

    it("should return user scopes when user has admin permission", async () => {
      // Setup test user
      const userData = {
        email: "admin@example.com",
        password: "password123",
      };

      const user = {
        id: 1,
        email: userData.email,
        createdAt: new Date(),
        lastLoginAt: null,
      };

      // Mock database responses
      vi.spyOn(db.users, "getByEmail").mockResolvedValue(user);
      vi.spyOn(db.emailAuth, "getByEmail").mockResolvedValue({
        userId: user.id,
        email: user.email,
        passwordHash: Buffer.from("hashed-password"),
        verifiedAt: null,
        verificationToken: null,
        verificationTokenExpiresAt: null,
        forgotPasswordToken: null,
        forgotPasswordTokenExpiresAt: null,
      });
      vi.spyOn(db.users, "getById").mockResolvedValue(user);
      vi.spyOn(db.users, "updateLastLogin").mockResolvedValue({
        ...user,
        lastLoginAt: new Date(),
      });
      vi.spyOn(argon2, "verify").mockResolvedValue(true);

      // Mock permissions to return admin scope
      vi.spyOn(db.permissions, "getByUserId").mockResolvedValue([
        {
          id: 1,
          userId: user.id,
          permission: "admin",
          createdAt: new Date(),
          grantedBy: user.id,
        },
      ]);

      // Use agent to maintain cookies between requests
      const agent = request.agent(app);

      // Login first to establish session
      const loginResponse = await agent.post("/auth/login").send(userData);

      expect(loginResponse.status).toBe(200);

      // Then verify authentication
      const verifyResponse = await agent.get("/auth/verify");

      expect(verifyResponse.status).toBe(200);
      expect(verifyResponse.body).toEqual({
        id: user.id,
        email: user.email,
        scopes: ["admin"],
      });
      expect(verifyResponse.header["x-user-id"]).toBe(user.id.toString());
      expect(verifyResponse.header["x-user-email"]).toBe(user.email);
      expect(verifyResponse.header["x-user-scopes"]).toBe("admin");
    });
  });

  describe("POST /auth/forgot-password", () => {
    it("should generate and store reset token when user exists", async () => {
      const email = "test@example.com";
      const user = {
        id: 1,
        email,
        createdAt: new Date(),
        lastLoginAt: null,
      };

      // Mock database responses
      vi.spyOn(db.users, "getByEmail").mockResolvedValue(user);
      vi.spyOn(db.emailAuth, "updateForgotPasswordToken").mockResolvedValue({
        userId: user.id,
        email: user.email,
        passwordHash: Buffer.from("hashed-password"),
        verifiedAt: null,
        verificationToken: null,
        verificationTokenExpiresAt: null,
        forgotPasswordToken: "test-token",
        forgotPasswordTokenExpiresAt: new Date(),
      });

      const response = await request(app)
        .post("/auth/forgot-password")
        .send({ email });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: "If the email exists, a recovery email has been sent",
      });

      expect(db.users.getByEmail).toHaveBeenCalledWith(email);
      expect(db.emailAuth.updateForgotPasswordToken).toHaveBeenCalledWith(
        user.id,
        expect.any(String),
        expect.any(Date),
      );
    });

    it("should return success even when user doesn't exist to prevent email enumeration", async () => {
      const email = "nonexistent@example.com";

      // Mock database to return null for non-existent user
      vi.spyOn(db.users, "getByEmail").mockRejectedValue(
        new db.users.UserNotFoundError(),
      );

      const response = await request(app)
        .post("/auth/forgot-password")
        .send({ email });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: "If the email exists, a recovery email has been sent",
      });

      expect(db.users.getByEmail).toHaveBeenCalledWith(email);
      expect(db.emailAuth.updateForgotPasswordToken).not.toHaveBeenCalled();
    });
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
