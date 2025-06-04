import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import request from "supertest";
import express from "express";
import { createApp } from "../../app.ts";
import { getCsrfToken } from "./_test-helpers.ts";

// Mock the email package
vi.mock("@saflib/email");

describe("Get Profile Route", () => {
  let app: express.Express;

  beforeEach(() => {
    app = createApp();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should get user profile successfully when authenticated", async () => {
    const userData = {
      email: "test@example.com",
      name: "Test User",
      givenName: "Test",
      familyName: "User",
      password: "password123",
    };

    const agent = request.agent(app);

    // Register and get CSRF token
    const registerResponse = await agent.post("/auth/register").send(userData);

    expect(registerResponse.status).toBe(200);
    const csrfToken = getCsrfToken(registerResponse);

    // Verify authentication (this sets up the session properly)
    const verifyResponse = await agent
      .get("/auth/verify")
      .set("X-CSRF-TOKEN", csrfToken);
    expect(verifyResponse.status).toBe(200);

    const response = await agent
      .get("/auth/profile")
      .set("X-CSRF-TOKEN", csrfToken);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: expect.any(Number),
      email: userData.email,
      emailVerified: false,
      name: userData.name,
      givenName: userData.givenName,
      familyName: userData.familyName,
    });
  });

  it("should return 401 when not authenticated", async () => {
    const response = await request(app).get("/auth/profile");

    expect(response.status).toBe(401);
  });
});
