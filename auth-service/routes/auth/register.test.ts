import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import { createApp } from "../../app.ts";
import passport from "passport";
import { getCsrfToken, testRateLimiting } from "./_test-helpers.ts";
import { EmailClient } from "@saflib/email";

// Mock the email package
vi.mock("@saflib/email");

describe("Register Route", () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    (passport as any)._serializers = [];
    (passport as any)._deserializers = [];
    app = createApp();
    vi.spyOn(EmailClient.prototype, "sendEmail");
  });

  it("should register a new user successfully and log them in and send a verification email", async () => {
    const userData = {
      email: "test@example.com",
      password: "password123",
    };

    const agent = request.agent(app);
    const response = await agent.post("/auth/register").send(userData);
    const csrfToken = getCsrfToken(response);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: expect.any(Number),
      email: userData.email,
      scopes: [],
    });

    const verifyResponse = await agent
      .get("/auth/verify")
      .set("x-csrf-token", csrfToken);
    expect(verifyResponse.status).toBe(200);
    expect(verifyResponse.body).toEqual({
      id: expect.any(Number),
      email: userData.email,
      scopes: ["none"],
    });

    expect(EmailClient.prototype.sendEmail).toHaveBeenCalledWith({
      from: "noreply@your-domain.com",
      html: expect.any(String),
      subject: "Verify Your Email Address",
      to: userData.email,
    });
  });

  it("should return 409 for duplicate email", async () => {
    const userData = {
      email: "test@example.com",
      password: "password123",
    };

    await request(app).post("/auth/register").send(userData);

    const response = await request(app).post("/auth/register").send(userData);

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      message: "Email already exists",
    });
    expect(EmailClient.prototype.sendEmail).toHaveBeenCalledTimes(1);
  });

  it("should return 429 for too many requests", async () => {
    await testRateLimiting(() =>
      request(app).post("/auth/register").send({
        email: "test@example.com",
        password: "password123",
      }),
    );
  });
});
