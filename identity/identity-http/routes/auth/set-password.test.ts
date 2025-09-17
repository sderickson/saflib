import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import { createApp } from "../../http.ts";
import passport from "passport";
import { testRateLimiting } from "./_test-helpers.ts";

const callbacks = {
  onPasswordUpdated: async () => {},
};
const onPasswordUpdatedSpy = vi.spyOn(callbacks, "onPasswordUpdated");

describe("Set Password Route", () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    (passport as any)._serializers = [];
    (passport as any)._deserializers = [];
    app = createApp({ callbacks });
  });

  it("should change password successfully for logged in user", async () => {
    const userData = {
      email: "test@example.com",
      password: "password123",
      name: "Test User",
    };

    // Register and login user
    const agent = request.agent(app);
    const registerResponse = await agent.post("/auth/register").send(userData);
    expect(registerResponse.status).toBe(200);

    const loginResponse = await agent.post("/auth/login").send({
      email: userData.email,
      password: userData.password,
    });
    expect(loginResponse.status).toBe(200);

    // Change password
    const setPasswordData = {
      currentPassword: "password123",
      newPassword: "newpassword456",
    };

    const response = await agent
      .post("/auth/set-password")
      .set("x-user-id", registerResponse.body.id)
      .set("x-user-email", userData.email)
      .set("x-user-scopes", "none")
      .send(setPasswordData);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
    });

    // Verify we can login with the new password
    const agent2 = request.agent(app);
    const newLoginResponse = await agent2.post("/auth/login").send({
      email: userData.email,
      password: "newpassword456",
    });
    expect(newLoginResponse.status).toBe(200);

    // Verify we cannot login with the old password
    const agent3 = request.agent(app);
    const oldLoginResponse = await agent3.post("/auth/login").send({
      email: userData.email,
      password: "password123",
    });
    expect(oldLoginResponse.status).toBe(401);

    expect(onPasswordUpdatedSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        user: expect.objectContaining({
          email: userData.email,
        }),
      }),
    );
    expect(onPasswordUpdatedSpy).toHaveBeenCalledTimes(1);
  });

  it("should return 401 for unauthenticated user", async () => {
    const setPasswordData = {
      currentPassword: "password123",
      newPassword: "newpassword456",
    };

    const response = await request(app)
      .post("/auth/set-password")
      .send(setPasswordData);

    expect(response.status).toBe(401);
  });

  it("should return 401 for incorrect current password", async () => {
    const userData = {
      email: "test@example.com",
      password: "password123",
      name: "Test User",
    };

    // Register and login user
    const agent = request.agent(app);
    const registerResponse = await agent.post("/auth/register").send(userData);
    expect(registerResponse.status).toBe(200);

    const loginResponse = await agent.post("/auth/login").send({
      email: userData.email,
      password: userData.password,
    });
    expect(loginResponse.status).toBe(200);

    // Try to change password with wrong current password
    const setPasswordData = {
      currentPassword: "wrongpassword",
      newPassword: "newpassword456",
    };

    const response = await agent
      .post("/auth/set-password")
      .set("x-user-id", registerResponse.body.id)
      .set("x-user-email", userData.email)
      .set("x-user-scopes", "none")
      .send(setPasswordData);

    expect(response.status).toBe(401);
  });

  it("should return 400 for missing required fields", async () => {
    const userData = {
      email: "test@example.com",
      password: "password123",
      name: "Test User",
    };

    const agent = request.agent(app);
    const registerResponse = await agent.post("/auth/register").send(userData);
    expect(registerResponse.status).toBe(200);

    const loginResponse = await agent.post("/auth/login").send({
      email: userData.email,
      password: userData.password,
    });
    expect(loginResponse.status).toBe(200);

    // Try with missing newPassword
    const response = await agent
      .post("/auth/set-password")
      .set("x-user-id", registerResponse.body.id)
      .set("x-user-email", userData.email)
      .set("x-user-scopes", "none")
      .send({ currentPassword: "password123" });

    expect(response.status).toBe(400);
  });

  it("should return 429 for too many requests", async () => {
    await testRateLimiting(() =>
      request(app).post("/auth/set-password").send({
        currentPassword: "password123",
        newPassword: "newpassword456",
      }),
    );
  });
});
