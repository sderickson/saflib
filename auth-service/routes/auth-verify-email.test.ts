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

// Mock crypto
vi.mock("crypto", async (importOriginal) => {
  const crypto = await importOriginal<typeof import("crypto")>();
  return {
    ...crypto,
    randomBytes: vi.fn().mockReturnValue("test-token"),
  };
});

describe("Verify Email Route", () => {
  let app: express.Express;

  beforeEach(() => {
    (passport as any)._serializers = [];
    (passport as any)._deserializers = [];
    app = createApp();
    vi.clearAllMocks();
  });

  it("should verify email with valid token", async () => {
    // First create a user
    const userData = {
      email: "test@example.com",
      password: "password123",
    };
    const agent = request.agent(app);
    const response1 = await agent.post("/auth/register").send(userData);
    expect(response1.status).toBe(200);

    // Request verification email to get a token
    const response2 = await agent.post("/auth/resend-verification");
    expect(response2.status).toBe(200);

    // Get the token from the logs (in a real app, this would be sent via email)
    const token = "test-token"; // This would be the actual token from the email

    // Verify the email
    const response = await request(app)
      .post("/auth/verify-email")
      .send({ token });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: expect.any(Number),
      email: userData.email,
      scopes: [],
    });
  });

  it("should return 400 for missing token", async () => {
    const response = await request(app).post("/auth/verify-email").send({});

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: "request/body must have required property 'token'",
      status: 400,
    });
  });

  it("should return 400 for invalid token", async () => {
    const response = await request(app)
      .post("/auth/verify-email")
      .send({ token: "invalid" });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: "Invalid or expired verification token",
    });
  });
});
