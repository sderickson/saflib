import { createApp } from "../../app.ts";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";
import express from "express";

// Mock user headers for all requests
const mockHeaders = {
  "x-user-id": "1",
  "x-user-email": "test@example.com",
  "x-user-scopes": "users:read",
};

describe("Login Route", () => {
  let app: express.Express;

  beforeEach(() => {
    app = createApp();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return a list of users", async () => {
    const response = await request(app).get("/users").set(mockHeaders);
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it("should return 403 if user does not have users:read scope", async () => {
    const response = await request(app)
      .get("/users")
      .set({
        ...mockHeaders,
        "x-user-scopes": "none",
      });
    console.log("response", response.body);
    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      error: "Insufficient permissions. Missing scopes: users:read",
    });
  });
});
