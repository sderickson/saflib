import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import { createApp } from "../../http.ts";
import { testRateLimiting } from "./_test-helpers.ts";
import type { IdentityServiceCallbacks } from "@saflib/identity-common";

const identityServiceCallbacks: IdentityServiceCallbacks = {
  onPasswordReset: async () => {},
};

const onPasswordResetSpy = vi.spyOn(
  identityServiceCallbacks,
  "onPasswordReset",
);

describe("Forgot Password Route", () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createApp({ callbacks: identityServiceCallbacks });
  });

  it("should generate and store reset token when user exists and send email", async () => {
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

    expect(onPasswordResetSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        user: expect.objectContaining({
          email: userData.email,
        }),
        resetUrl: expect.any(String),
      }),
    );
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
    expect(onPasswordResetSpy).not.toHaveBeenCalled();
  });

  it("should return 429 for too many requests", async () => {
    await testRateLimiting(() =>
      request(app).post("/auth/forgot-password").send({
        email: "test@example.com",
      }),
    );
  });
});
