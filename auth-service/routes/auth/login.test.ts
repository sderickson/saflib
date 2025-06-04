import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";
import express from "express";
import { createApp } from "../../app.ts";
import { testRateLimiting } from "./_test-helpers.ts";

// Mock the email package
vi.mock("@saflib/email");

describe("Login Route", () => {
  let app: express.Express;

  beforeEach(() => {
    app = createApp();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should login a user successfully", async () => {
    const userData = {
      email: "test@example.com",
      name: "Test User",
      password: "password123",
    };
    await request(app).post("/auth/register").send(userData);

    const response = await request(app).post("/auth/login").send({
      email: userData.email,
      password: userData.password,
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: expect.any(Number),
      email: userData.email,
      emailVerified: false,
      name: userData.name,
      scopes: [],
    });
  });

  it("should return 401 for wrong password", async () => {
    const userData = {
      email: "test@example.com",
      password: "password123",
    };
    await request(app).post("/auth/register").send(userData);

    // Try to login with wrong password
    const response = await request(app)
      .post("/auth/login")
      .send({ ...userData, password: "wrong" });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      message: "Invalid credentials",
    });
  });

  it("should return 401 for non-existent user", async () => {
    const response = await request(app)
      .post("/auth/login")
      .send({ email: "nonexistent@example.com", password: "password123" });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      message: "Invalid credentials",
    });
  });

  it("should return 429 for too many requests", async () => {
    await testRateLimiting(() =>
      request(app).post("/auth/login").send({
        email: "test@example.com",
        password: "password123",
      }),
    );
  });
});
