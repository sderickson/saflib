import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import { createApp } from "../app.ts";
import passport from "passport";
import { getCsrfToken } from "./helpers.ts";

describe("Verify Route", () => {
  let app: express.Express;

  beforeEach(() => {
    process.env.ADMIN_EMAILS = "admin@example.com";
    (passport as any)._serializers = [];
    (passport as any)._deserializers = [];

    app = createApp();
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    const response = await request(app).get("/auth/verify");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: "Unauthorized!" });
  });

  it("should return user info when authenticated", async () => {
    // First create and login a user
    const userData = {
      email: "test@example.com",
      password: "password123",
    };
    const agent = request.agent(app);
    const res1 = await agent.post("/auth/register").send(userData);
    expect(res1.status).toBe(200);
    const csrfToken = getCsrfToken(res1);
    const response = await agent
      .get("/auth/verify")
      .set("x-csrf-token", csrfToken);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: expect.any(Number),
      email: userData.email,
      scopes: ["none"],
    });
    expect(response.header["x-user-id"]).toBeDefined();
    expect(response.header["x-user-email"]).toBe(userData.email);
    expect(response.header["x-user-scopes"]).toBe("none");
  });

  it("should handle health check requests", async () => {
    const response = await request(app)
      .get("/auth/verify")
      .set("x-forwarded-uri", "/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({});
  });

  it("should handle OPTIONS requests", async () => {
    const response = await request(app)
      .get("/auth/verify")
      .set("x-forwarded-method", "OPTIONS");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({});
  });

  it("should add admin scope when user email is in ADMIN_EMAILS", async () => {
    const userData = {
      email: "admin@example.com",
      password: "password123",
    };
    const agent = request.agent(app);
    const res1 = await agent.post("/auth/register").send(userData);
    const csrfToken = getCsrfToken(res1);
    expect(res1.status).toBe(200);
    const res2 = await agent.post("/auth/login").send(userData);
    expect(res2.status).toBe(200);
    // Then verify authentication
    const response = await agent
      .get("/auth/verify")
      .set("x-csrf-token", csrfToken);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: expect.any(Number),
      email: userData.email,
      scopes: ["admin"],
    });
    expect(response.header["x-user-id"]).toBeDefined();
    expect(response.header["x-user-email"]).toBe(userData.email);
    expect(response.header["x-user-scopes"]).toBe("admin");
  });
});
