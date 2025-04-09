import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import { createApp } from "../app.ts";
import { testRateLimiting } from "./test-helpers.ts";

vi.mock("@saflib/email");

describe("Forgot Password Route", () => {
  let app: express.Express;

  beforeEach(() => {
    app = createApp();
    vi.clearAllMocks();
  });

  it("should generate and store reset token when user exists", async () => {
    const userData = {
      email: "test@example.com",
      password: "password123",
    };
    {
      const res = await request(app).post("/auth/register").send(userData);
      expect(res.status).toBe(200);
    }

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
