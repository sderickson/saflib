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
  })
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
        new db.users.EmailConflictError()
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
      vi.spyOn(db.permissions, "add").mockResolvedValue(undefined);

      // Set NODE_ENV to TEST
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "test";

      const response = await request(app).post("/auth/register").send(userData);

      // Restore original NODE_ENV
      process.env.NODE_ENV = originalEnv;

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        email: userData.email,
        id: createdUser.id,
      });
      expect(db.permissions.add).toHaveBeenCalledWith(
        createdUser.id,
        "admin",
        createdUser.id
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
      vi.spyOn(db.permissions, "add").mockResolvedValue(undefined);

      // Set NODE_ENV to TEST
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "test";

      const response = await request(app).post("/auth/register").send(userData);

      // Restore original NODE_ENV
      process.env.NODE_ENV = originalEnv;

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        email: userData.email,
        id: createdUser.id,
      });
      expect(db.permissions.add).not.toHaveBeenCalled();
    });

    it("should not auto-assign admin permission when NODE_ENV is not TEST", async () => {
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
      vi.spyOn(db.permissions, "add").mockResolvedValue(undefined);

      // Set NODE_ENV to PRODUCTION
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      const response = await request(app).post("/auth/register").send(userData);

      // Restore original NODE_ENV
      process.env.NODE_ENV = originalEnv;

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
        new db.users.UserNotFoundError()
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
});
