import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import { createApp } from "../app.ts";
import { testRateLimiting } from "./test-helpers.ts";
// Mock argon2
vi.mock("argon2", () => ({
  hash: vi.fn().mockResolvedValue("hashed-password"),
  verify: vi.fn().mockResolvedValue(true),
}));

describe("Forgot Password Route", () => {
  let app: express.Express;

  beforeEach(() => {
    app = createApp();
    vi.clearAllMocks();
  });

  it("should generate and store reset token when user exists", async () => {
    // First create a user
    const userData = {
      email: "test@example.com",
      password: "password123",
    };
    await request(app).post("/auth/register").send(userData);

    // Then try to request password reset
    const response = await request(app)
      .post("/auth/forgot-password")
      .send({ email: userData.email });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      message: "If the email exists, a recovery email has been sent",
    });
  });

  it("should return success even when user doesn't exist to prevent email enumeration", async () => {
    const response = await request(app)
      .post("/auth/forgot-password")
      .send({ email: "nonexistent@example.com" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      message: "If the email exists, a recovery email has been sent",
    });
  });

  it("should return 429 for too many requests", async () => {
    await testRateLimiting(() =>
      request(app).post("/auth/forgot-password").send({
        email: "test@example.com",
      }),
    );
  });
});
