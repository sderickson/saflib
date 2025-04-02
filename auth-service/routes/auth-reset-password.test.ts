import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import { createApp } from "../app.ts";
// Mock argon2
vi.mock("argon2", () => ({
  hash: vi.fn().mockResolvedValue("hashed-password"),
  verify: vi.fn().mockResolvedValue(true),
}));

describe("Reset Password Route", () => {
  let app: express.Express;

  beforeEach(() => {
    app = createApp();
    vi.clearAllMocks();
  });

  it("should reset password successfully with valid token", async () => {
    // First create a user
    const userData = {
      email: "test@example.com",
      password: "password123",
    };
    const response1 = await request(app).post("/auth/register").send(userData);
    expect(response1.status).toBe(200);

    // Request password reset to get a token
    const response2 = await request(app)
      .post("/auth/forgot-password")
      .send({ email: userData.email });
    expect(response2.status).toBe(200);

    // Get the token from the logs (in a real app, this would be sent via email)
    const token = "test-token"; // This would be the actual token from the email

    // Reset password with the token
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
  });

  it("should return 404 for expired token", async () => {
    const response = await request(app)
      .post("/auth/reset-password")
      .send({ token: "expired-token", newPassword: "new-password123" });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: "Invalid or expired token" });
  });

  it("should return 404 for invalid token", async () => {
    const response = await request(app)
      .post("/auth/reset-password")
      .send({ token: "invalid-token", newPassword: "new-password123" });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: "Invalid or expired token" });
  });
});
