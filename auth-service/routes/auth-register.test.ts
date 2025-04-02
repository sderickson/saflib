import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import { registerRouter } from "./auth-register.ts";
import {
  recommendedErrorHandlers,
  recommendedPreMiddleware,
} from "@saflib/node-express";
import { AuthDB } from "@saflib/auth-db";

// Mock argon2
vi.mock("argon2", () => ({
  hash: vi.fn().mockResolvedValue("hashed-password"),
  verify: vi.fn().mockResolvedValue(true),
}));

describe("Register Route", () => {
  let app: express.Express;

  beforeEach(() => {
    const db = new AuthDB({ inMemory: true });
    app = express();
    app.use(recommendedPreMiddleware);

    // Create fresh in-memory db for each test
    app.use((req, _, next) => {
      req.db = db;
      next();
    });

    app.use("/auth", registerRouter);
    app.use(recommendedErrorHandlers);
    vi.clearAllMocks();
  });

  it("should register a new user successfully", async () => {
    const userData = {
      email: "test@example.com",
      password: "password123",
    };

    const response = await request(app).post("/auth/register").send(userData);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: expect.any(Number),
      email: userData.email,
      scopes: [],
    });
  });

  it("should return 409 for duplicate email", async () => {
    const userData = {
      email: "test@example.com",
      password: "password123",
    };

    // Create the first user
    await request(app).post("/auth/register").send(userData);

    // Try to create a duplicate
    const response = await request(app).post("/auth/register").send(userData);

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      message: "Email already exists",
    });
  });

  it("should auto-assign admin permission for test environment users with admin.*@email.com pattern", async () => {
    process.env.ALLOW_ADMIN_SIGNUPS = "true";
    const userData = {
      email: "admin.test@email.com",
      password: "password123",
    };

    const response = await request(app).post("/auth/register").send(userData);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: expect.any(Number),
      email: userData.email,
      scopes: ["admin"],
    });
  });

  it("should not auto-assign admin permission for non-admin email pattern", async () => {
    process.env.ALLOW_ADMIN_SIGNUPS = "true";
    const userData = {
      email: "regular@example.com",
      password: "password123",
    };

    const response = await request(app).post("/auth/register").send(userData);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: expect.any(Number),
      email: userData.email,
      scopes: [],
    });
  });

  it("should not auto-assign admin permission when ALLOW_ADMIN_SIGNUPS is not true", async () => {
    process.env.ALLOW_ADMIN_SIGNUPS = "false";
    const userData = {
      email: "admin.test@email.com",
      password: "password123",
    };

    const response = await request(app).post("/auth/register").send(userData);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: expect.any(Number),
      email: userData.email,
      scopes: [],
    });
  });
});
