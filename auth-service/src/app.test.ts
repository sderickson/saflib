import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";
import request from "supertest";
import * as argon2 from "argon2";
import { AuthDB } from "@saflib/auth-db";
import { createApp } from "./app.ts";

// Mock argon2
vi.mock("argon2", () => ({
  hash: vi.fn().mockResolvedValue("hashed-password"),
  verify: vi.fn().mockResolvedValue(true),
}));

describe("Auth Service Library", () => {
  let app: Express.Application;
  let db: AuthDB;

  beforeEach(() => {
    vi.clearAllMocks();
    // Create a fresh app instance for each test
    db = new AuthDB({ inMemory: true });
    app = createApp({
      domain: "test.com",
      protocol: "http",
      nodeEnv: "test",
      sessionSecret: "test-secret",
    });
  });

  describe("POST /auth/register", () => {
    it("should register a new user successfully", async () => {
      const userData = {
        email: "test@example.com",
        password: "password123",
        name: "Test User",
      };

      const createdUser = {
        id: 1,
        email: userData.email,
        name: userData.name,
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
      expect(response.body).toEqual({ message: "Registration successful" });

      expect(db.users.create).toHaveBeenCalledWith({
        email: userData.email,
        name: userData.name,
        createdAt: expect.any(Date),
      });

      expect(db.emailAuth.create).toHaveBeenCalledWith({
        userId: createdUser.id,
        email: userData.email,
        passwordHash: expect.any(Buffer),
      });

      expect(argon2.hash).toHaveBeenCalledWith(userData.password);
    });

    it("should return 400 for duplicate email", async () => {
      const userData = {
        email: "test@example.com",
        password: "password123",
        name: "Test User",
      };

      vi.spyOn(db.users, "create").mockRejectedValue(
        new db.users.EmailConflictError()
      );

      const response = await request(app).post("/auth/register").send(userData);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "Email already registered" });
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
        name: "Test User",
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
      expect(response.body).toEqual({ message: "Login successful" });
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
        name: "Test User",
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

      // Use agent to maintain cookies between requests
      const agent = request.agent(app);

      // Login first
      await agent.post("/auth/login").send(userData);

      // Then logout
      const response = await agent.post("/auth/logout");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: "Logout successful" });
    });
  });

  describe("GET /auth/me", () => {
    it("should return 401 when not authenticated", async () => {
      const response = await request(app).get("/auth/me");

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ message: "Not authenticated" });
    });

    it("should return user data when authenticated", async () => {
      // Setup test user
      const userData = {
        email: "test@example.com",
        password: "password123",
      };

      const user = {
        id: 1,
        email: userData.email,
        name: "Test User",
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

      // Then get user data
      const meResponse = await agent.get("/auth/me");

      expect(meResponse.status).toBe(200);
      expect(meResponse.body).toEqual(user);
    });
  });
});
