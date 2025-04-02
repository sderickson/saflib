import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import { createApp } from "../app.ts";
import passport from "passport";

// Mock argon2
vi.mock("argon2", () => ({
  hash: vi.fn().mockResolvedValue("hashed-password"),
  verify: vi.fn().mockResolvedValue(true),
}));

describe("Register Route", () => {
  let app: express.Express;

  beforeEach(() => {
    (passport as any)._serializers = [];
    (passport as any)._deserializers = [];
    app = createApp();
    vi.clearAllMocks();
  });

  it("should register a new user successfully and log them in", async () => {
    const userData = {
      email: "test@example.com",
      password: "password123",
    };

    const agent = request.agent(app);
    const response = await agent.post("/auth/register").send(userData);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: expect.any(Number),
      email: userData.email,
      scopes: [],
    });

    // Verify the user is logged in by checking a protected route
    const verifyResponse = await agent.get("/auth/verify");
    expect(verifyResponse.status).toBe(200);
    expect(verifyResponse.body).toEqual({
      id: expect.any(Number),
      email: userData.email,
      scopes: ["none"],
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
});
