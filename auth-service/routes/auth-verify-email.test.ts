import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";
import express from "express";
import { createApp } from "../app.ts";
import passport from "passport";
import { testRateLimiting } from "./test-helpers.ts";

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
      password: "password123",
    };
    const agent = request.agent(app);
    {
      const res = await agent.post("/auth/register").send(userData);
      expect(res.status).toBe(200);
    }

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

  it("should return 400 for expired token", async () => {
    const userData = {
      email: "test@example.com",
      password: "password123",
    };
    const agent = request.agent(app);
    {
      const res = await agent.post("/auth/register").send(userData);
      expect(res.status).toBe(200);
    }

    {
      const res = await agent.post("/auth/resend-verification");
      expect(res.status).toBe(200);
    }

    const token = "test-token";

    vi.advanceTimersByTime(1000 * 60 * 60 * 24 * 30);
    const response = await request(app)
      .post("/auth/verify-email")
      .send({ token });

    expect(response.status).toBe(400);
  });

  it("should return 400 for used token", async () => {
    const userData = {
      email: "test@example.com",
      password: "password123",
    };

    const agent = request.agent(app);
    {
      const res = await agent.post("/auth/register").send(userData);
      expect(res.status).toBe(200);
    }

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

  it("should return 429 for too many requests", async () => {
    await testRateLimiting(() =>
      request(app).post("/auth/verify-email").send({ token: "test-token" }),
    );
  });
});
