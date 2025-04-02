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
    const registerResponse = await request(app)
      .post("/auth/register")
      .send(userData);
    expect(registerResponse.status).toBe(200);

    // Get the verification token from the logs
    const agent = request.agent(app);
    const loginResponse = await agent.post("/auth/login").send(userData);
    expect(loginResponse.status).toBe(200);

    const resendResponse = await agent.post("/auth/resend-verification");
    expect(resendResponse.status).toBe(200);

    // Extract token from logs (in a real app this would come from an email)
    const logInfo = vi.mocked(console.log).mock.calls[0][0] as string;
    const token = logInfo.split("token=")[1];

    // Verify the email
    const response = await request(app).get(
      `/auth/verify-email?token=${token}`,
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: expect.any(Number),
      email: userData.email,
      scopes: [],
    });
  });

  it("should return 400 for missing token", async () => {
    const response = await request(app).get("/auth/verify-email");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: "Verification token is required",
    });
  });

  it("should return 400 for invalid token", async () => {
    const response = await request(app).get("/auth/verify-email?token=invalid");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: "Invalid or expired verification token",
    });
  });
});
