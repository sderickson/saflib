import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import request from "supertest";
import express from "express";
import { createApp } from "../../app.ts";
import { getCsrfToken } from "./_test-helpers.ts";

// Mock the email package
vi.mock("@saflib/email");

vi.mock("crypto", async (importOriginal) => {
  const crypto = await importOriginal<typeof import("crypto")>();
  return {
    ...crypto,
    randomBytes: vi.fn().mockReturnValue("test-token"),
  };
});

describe("Update Profile Route", () => {
  let app: express.Express;

  beforeEach(() => {
    app = createApp();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should update name fields successfully when authenticated", async () => {
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

    // Verify authentication
    const verifyResponse = await agent
      .get("/auth/verify")
      .set("X-CSRF-TOKEN", csrfToken);
    expect(verifyResponse.status).toBe(200);

    // Update name fields
    const updateData = {
      name: "Updated Name",
      givenName: "Updated",
      familyName: "Name",
    };

    const response = await agent
      .put("/auth/profile")
      .set("X-CSRF-TOKEN", csrfToken)
      .send(updateData);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: expect.any(Number),
      email: userData.email,
      name: updateData.name,
      givenName: updateData.givenName,
      familyName: updateData.familyName,
    });
  });

  it("should update email successfully when authenticated", async () => {
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

    // Verify authentication
    const verifyResponse = await agent
      .get("/auth/verify")
      .set("X-CSRF-TOKEN", csrfToken);
    expect(verifyResponse.status).toBe(200);

    // Update email
    const updateData = {
      email: "updated@example.com",
    };

    const response = await agent
      .put("/auth/profile")
      .set("X-CSRF-TOKEN", csrfToken)
      .send(updateData);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: expect.any(Number),
      email: updateData.email,
      name: userData.name,
      givenName: userData.givenName,
      familyName: userData.familyName,
    });
  });

  it("should update both name fields and email successfully", async () => {
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

    // Verify authentication
    const verifyResponse = await agent
      .get("/auth/verify")
      .set("X-CSRF-TOKEN", csrfToken);
    expect(verifyResponse.status).toBe(200);

    // Update both name fields and email
    const updateData = {
      email: "updated@example.com",
      name: "Updated Name",
      givenName: "Updated",
      familyName: "Name",
    };

    const response = await agent
      .put("/auth/profile")
      .set("X-CSRF-TOKEN", csrfToken)
      .send(updateData);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: expect.any(Number),
      email: updateData.email,
      name: updateData.name,
      givenName: updateData.givenName,
      familyName: updateData.familyName,
    });
  });

  it("should not update email if the same email is provided", async () => {
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

    // Verify authentication
    const verifyResponse = await agent
      .get("/auth/verify")
      .set("X-CSRF-TOKEN", csrfToken);
    expect(verifyResponse.status).toBe(200);

    // Send the same email (should not trigger email update)
    const updateData = {
      email: userData.email,
      name: "Updated Name",
    };

    const response = await agent
      .put("/auth/profile")
      .set("X-CSRF-TOKEN", csrfToken)
      .send(updateData);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: expect.any(Number),
      email: userData.email,
      name: updateData.name,
      givenName: userData.givenName,
      familyName: userData.familyName,
    });
  });

  it("should return 401 when not authenticated", async () => {
    const response = await request(app).put("/auth/profile").send({
      name: "Test Name",
    });

    expect(response.status).toBe(401);
  });

  it("should handle empty request body", async () => {
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

    // Verify authentication
    const verifyResponse = await agent
      .get("/auth/verify")
      .set("X-CSRF-TOKEN", csrfToken);
    expect(verifyResponse.status).toBe(200);

    // Send empty body (should not change anything)
    const response = await agent
      .put("/auth/profile")
      .set("X-CSRF-TOKEN", csrfToken)
      .send({});

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: expect.any(Number),
      email: userData.email,
      name: userData.name,
      givenName: userData.givenName,
      familyName: userData.familyName,
    });
  });

  it("clears email verification when email is updated", async () => {
    const userData = {
      email: "test@example.com",
      name: "Test User",
      password: "password123",
    };
    const agent = request.agent(app);
    const registerRes = await agent.post("/auth/register").send(userData);
    expect(registerRes.status).toBe(200);

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
      name: userData.name,
      scopes: [],
    });

    const updateData = {
      email: "updated@example.com",
    };

    const updateResponse = await agent.put("/auth/profile").send(updateData);

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body).toEqual({
      id: expect.any(Number),
      email: updateData.email,
      name: userData.name,
      givenName: null,
      familyName: null,
    });
  });
});
