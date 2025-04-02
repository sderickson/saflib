import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import { createApp } from "../app.ts";
import * as argon2 from "argon2";

// Mock argon2
vi.mock("argon2", () => ({
  hash: vi.fn().mockResolvedValue("hashed-password"),
  verify: vi.fn().mockResolvedValue(true),
}));

describe("Login Route", () => {
  let app: express.Express;

  beforeEach(() => {
    app = createApp();
    vi.clearAllMocks();
  });

  it("should login a user successfully", async () => {
    // First create a user
    const userData = {
      email: "test@example.com",
      password: "password123",
    };
    await request(app).post("/auth/register").send(userData);

    // Then try to login
    const response = await request(app).post("/auth/login").send(userData);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: expect.any(Number),
      email: userData.email,
      scopes: [],
    });
  });

  it("should return 401 for invalid password", async () => {
    // First create a user
    const userData = {
      email: "test@example.com",
      password: "password123",
    };
    vi.spyOn(argon2, "verify").mockResolvedValue(false);
    const result = await request(app).post("/auth/register").send(userData);
    console.log(result.body);

    // Try to login with wrong password
    const response = await request(app)
      .post("/auth/login")
      .send({ ...userData, password: "wrong-password" });

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
});
