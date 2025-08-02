import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import { createApp } from "../../http.ts";
import passport from "passport";
import { getCsrfToken, testRateLimiting } from "./_test-helpers.ts";

const callbacks = {
  onUserCreated: async () => {},
  onVerificationTokenCreated: async () => {},
};
const onCreateSpy = vi.spyOn(callbacks, "onUserCreated");
const onVerificationTokenCreatedSpy = vi.spyOn(
  callbacks,
  "onVerificationTokenCreated",
);

describe("Register Route", () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    (passport as any)._serializers = [];
    (passport as any)._deserializers = [];
    app = createApp({ callbacks });
  });

  it("should register a new user successfully and log them in, send a verification email, and call the onUserCreated callback", async () => {
    const userData = {
      email: "test@example.com",
      name: "Test User",
      givenName: "Test",
      familyName: "User",
      password: "password123",
    };

    const agent = request.agent(app);
    const response = await agent.post("/auth/register").send(userData);
    const csrfToken = getCsrfToken(response);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: expect.any(Number),
      email: userData.email,
      emailVerified: false,
      name: userData.name,
      givenName: userData.givenName,
      familyName: userData.familyName,
      scopes: [],
    });

    const verifyResponse = await agent
      .get("/auth/verify")
      .set("x-csrf-token", csrfToken);
    expect(verifyResponse.status).toBe(200);
    expect(verifyResponse.body).toEqual({
      id: expect.any(Number),
      email: userData.email,
      name: userData.name,
      scopes: ["none"],
    });

    expect(onCreateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        email: userData.email,
      }),
    );

    expect(onVerificationTokenCreatedSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        email: userData.email,
      }),
      expect.any(String),
      false,
    );
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
  });

  it("should return 429 for too many requests", async () => {
    await testRateLimiting(() =>
      request(app).post("/auth/register").send({
        email: "test@example.com",
        password: "password123",
      }),
    );
  });

  it("should return 400 for HTML in the body", async () => {
    const response = await request(app).post("/auth/register").send({
      email: "<script>alert('hello')</script>",
      password: "password123",
    });
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "HTML is not allowed" });
  });
});
