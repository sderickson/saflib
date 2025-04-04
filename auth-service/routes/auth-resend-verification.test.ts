import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import { createApp } from "../app.ts";
import passport from "passport";
import { testRateLimiting } from "./test-helpers.ts";

vi.mock("crypto", async (importOriginal) => {
  const crypto = await importOriginal<typeof import("crypto")>();
  return {
    ...crypto,
    randomBytes: vi.fn().mockReturnValue("test-token"),
  };
});

describe("Resend Verification Route", () => {
  let app: express.Express;

  beforeEach(() => {
    (passport as any)._serializers = [];
    (passport as any)._deserializers = [];
    app = createApp();
    vi.clearAllMocks();
  });

  it("should resend verification email for logged in user", async () => {
    const userData = {
      email: "test@example.com",
      password: "password123",
    };
    const registerResponse = await request(app)
      .post("/auth/register")
      .send(userData);
    expect(registerResponse.status).toBe(200);

    const agent = request.agent(app);

    const loginResponse = await agent.post("/auth/login").send(userData);
    expect(loginResponse.status).toBe(200);

    const response = await agent.post("/auth/resend-verification");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      message: "Verification email sent",
    });
  });

  it("should return 401 for unauthenticated user", async () => {
    const response = await request(app).post("/auth/resend-verification");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: "User must be logged in",
    });
  });

  it("should return 429 for too many requests", async () => {
    await testRateLimiting(() =>
      request(app).post("/auth/resend-verification"),
    );
  });
});
