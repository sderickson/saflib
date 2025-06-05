import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";
import express from "express";
import { createApp } from "../../app.ts";
import passport from "passport";
import { testRateLimiting } from "./_test-helpers.ts";

// Mock the email package
vi.mock("@saflib/email");

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
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("should verify email with valid token", async () => {
    const userData = {
      email: "test@example.com",
      name: "Test User",
      password: "password123",
    };
    const agent = request.agent(app);
    const registerRes = await agent.post("/auth/register").send(userData);
    expect(registerRes.status).toBe(200);

    {
      const res = await agent.post("/auth/resend-verification");
      expect(res.status).toBe(200);
    }

    const token = "test-token";

    const response = await agent.post("/auth/verify-email").send({ token });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: expect.any(Number),
      email: userData.email,
      emailVerified: true,
      name: userData.name,
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
      message: "Invalid or expired verification token",
    });
  });

  it("should return 400 for expired token", async () => {
    const userData = {
      email: "test@example.com",
      password: "password123",
    };
    const agent = request.agent(app);
    const registerRes = await agent.post("/auth/register").send(userData);
    expect(registerRes.status).toBe(200);

    {
      const res = await agent.post("/auth/resend-verification");

      expect(res.status).toBe(200);
    }

    const token = "test-token";

    vi.advanceTimersByTime(1000 * 60 * 60 * 24 * 30);
    const response = await agent
      .post("/auth/verify-email")
      .set("x-user-email", userData.email)
      .set("x-user-id", "1")
      .send({ token });

    expect(response.status).toBe(400);
  });

  it("should return 400 for used token", async () => {
    const userData = {
      email: "test@example.com",
      password: "password123",
    };

    const agent = request.agent(app);
    const registerRes = await agent.post("/auth/register").send(userData);
    expect(registerRes.status).toBe(200);

    {
      const res = await agent.post("/auth/resend-verification");

      expect(res.status).toBe(200);
    }

    const token = "test-token";

    {
      const res = await agent.post("/auth/verify-email").send({ token });
      expect(res.status).toBe(200);
    }

    {
      const res = await agent.post("/auth/verify-email").send({ token });
      expect(res.status).toBe(400);
    }
  });

  it("should return 401 when not authenticated", async () => {
    const userData = {
      email: "test@example.com",
      name: "Test User",
      password: "password123",
    };
    const agent = request.agent(app);
    const registerRes = await agent.post("/auth/register").send(userData);
    expect(registerRes.status).toBe(200);

    {
      const res = await agent.post("/auth/resend-verification");
      expect(res.status).toBe(200);
    }
    const response = await request(app)
      .post("/auth/verify-email")
      .send({ token: "test-token" });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      message: "Unauthorized",
    });
  });

  it("should return 403 when trying to verify email for different user", async () => {
    const userData1 = {
      email: "user1@example.com",
      password: "password123",
    };
    const userData2 = {
      email: "user2@example.com",
      password: "password123",
    };

    // Register first user and get their verification token
    const agent1 = request.agent(app);
    const registerRes1 = await agent1.post("/auth/register").send(userData1);
    expect(registerRes1.status).toBe(200);

    const resendRes1 = await agent1.post("/auth/resend-verification");
    expect(resendRes1.status).toBe(200);
    const token1 = "test-token"; // This would be the token for user1

    // Register second user (different agent/session)
    const agent2 = request.agent(app);
    const registerRes2 = await agent2.post("/auth/register").send(userData2);
    expect(registerRes2.status).toBe(200);

    // Try to verify user1's email while logged in as user2
    const response = await agent2
      .post("/auth/verify-email")
      .send({ token: token1 });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      message: "Forbidden",
    });
  });

  it("should return 429 for too many requests", async () => {
    await testRateLimiting(() =>
      request(app).post("/auth/verify-email").send({ token: "test-token" }),
    );
  });
});
