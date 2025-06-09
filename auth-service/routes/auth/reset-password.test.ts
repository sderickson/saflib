import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";
import express from "express";
import { createApp } from "../../http.ts";
import { testRateLimiting } from "./_test-helpers.ts";
// Mock argon2
import passport from "passport";

vi.mock("@saflib/email");

vi.mock("crypto", async (importOriginal) => {
  const crypto = await importOriginal<typeof import("crypto")>();
  return {
    ...crypto,
    randomBytes: vi.fn().mockReturnValue("test-token"),
  };
});

const callbacks = {
  onPasswordUpdated: async () => {},
};
const onPasswordUpdatedSpy = vi.spyOn(callbacks, "onPasswordUpdated");

describe("Reset Password Route", () => {
  let app: express.Express;

  beforeEach(() => {
    (passport as any)._serializers = [];
    (passport as any)._deserializers = [];
    app = createApp({ callbacks });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("should reset password successfully with valid token", async () => {
    const userData = {
      email: "test@example.com",
      password: "password123",
    };
    const agent = request.agent(app);
    const response1 = await agent.post("/auth/register").send(userData);
    expect(response1.status).toBe(200);

    const response2 = await agent.post("/auth/forgot-password").send({
      email: userData.email,
    });
    expect(response2.status).toBe(200);

    const token = "test-token";

    const response = await request(app)
      .post("/auth/reset-password")
      .send({ token, newPassword: "new-password123" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true });

    // Verify we can login with the new password
    const loginResponse = await request(app)
      .post("/auth/login")
      .send({ email: userData.email, password: "new-password123" });

    expect(loginResponse.status).toBe(200);
    expect(onPasswordUpdatedSpy).toHaveBeenCalledWith(
      expect.objectContaining({ email: userData.email }),
    );
    expect(onPasswordUpdatedSpy).toHaveBeenCalledTimes(1);
  });

  it("should return 400 for expired token", async () => {
    const response = await request(app)
      .post("/auth/reset-password")
      .send({ token: "expired-token", newPassword: "new-password123" });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: "Invalid or expired token" });
  });

  it("should return 400 for invalid token", async () => {
    const response = await request(app)
      .post("/auth/reset-password")
      .send({ token: "invalid-token", newPassword: "new-password123" });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: "Invalid or expired token" });
  });

  it("should return 400 for expired token", async () => {
    const userData = {
      email: "test@example.com",
      password: "password123",
    };
    const agent = request.agent(app);
    const response1 = await agent.post("/auth/register").send(userData);
    expect(response1.status).toBe(200);

    const response2 = await agent.post("/auth/forgot-password").send({
      email: userData.email,
    });
    expect(response2.status).toBe(200);

    const token = "test-token";

    vi.advanceTimersByTime(1000 * 60 * 30);

    const response = await request(app)
      .post("/auth/reset-password")
      .send({ token, newPassword: "new-password123" });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: "Invalid or expired token" });
  });

  it("should return 429 for too many requests", async () => {
    await testRateLimiting(() =>
      request(app).post("/auth/reset-password").send({
        token: "test-token",
        newPassword: "new-password123",
      }),
    );
  });
});
