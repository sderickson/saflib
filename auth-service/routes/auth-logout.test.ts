import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import { createApp } from "../app.ts";

describe("Logout Route", () => {
  let app: express.Express;

  beforeEach(() => {
    app = createApp();
    vi.clearAllMocks();
  });

  it("should logout a user successfully", async () => {
    // First create and login a user
    const userData = {
      email: "test@example.com",
      password: "password123",
    };
    await request(app).post("/auth/register").send(userData);
    await request(app).post("/auth/login").send(userData);

    // Then try to logout
    const response = await request(app).post("/auth/logout");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({});
  });

  it("should return 200 even when not logged in", async () => {
    const response = await request(app).post("/auth/logout");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({});
  });
});
