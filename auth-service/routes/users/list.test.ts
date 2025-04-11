import { createApp } from "../../app.ts";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";
import express from "express";

vi.mock("@saflib/email");

// Helper function to register a user
async function registerUser(app: express.Express, userData: any) {
  return request(app).post("/auth/register").send(userData);
}

// Helper function to login and get an agent
async function getAgentWithScopes(app: express.Express, scopes: string[]) {
  const agent = request.agent(app);
  // const res = await agent.post("/auth/login").send(userData);
  // console.log(res.body);
  agent.set("x-user-id", "1");
  agent.set("x-user-email", "test@example.com");
  agent.set("x-user-scopes", scopes.join(","));

  return agent;
}

describe("GET /users Route (Integration)", () => {
  let app: express.Express;
  const adminEmail = "admin@test.com";
  const adminPassword = "password123";
  const userEmail = "user@test.com";
  const userPassword = "password123";

  beforeEach(() => {
    // Set ADMIN_EMAILS before creating the app for this test suite
    vi.useFakeTimers();
    process.env.ADMIN_EMAILS = adminEmail;
    // Create a fresh app instance with a fresh in-memory DB for each test
    app = createApp();
  });

  afterEach(() => {
    // Cleanup potentially set env vars
    delete process.env.ADMIN_EMAILS;
    vi.resetAllMocks(); // Reset any potential mocks if used elsewhere
    vi.useRealTimers();
  });

  it("should return 401 if user is not authenticated", async () => {
    const response = await request(app).get("/users");
    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Unauthorized");
  });

  it("should return 403 if authenticated user is not an admin", async () => {
    // Login as non-admin user
    const agent = await getAgentWithScopes(app, ["none"]);

    // Attempt to access the route
    const response = await agent.get("/users");

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      error: "Insufficient permissions. Missing scopes: users:read",
    });
  });

  it("should return a sorted list of all users for an admin", async () => {
    const resAdmin = await registerUser(app, {
      email: adminEmail,
      password: adminPassword,
    });
    const adminUserId = resAdmin.body.id;

    vi.advanceTimersByTime(1000);
    const resUser = await registerUser(app, {
      email: userEmail,
      password: userPassword,
    });
    const userId = resUser.body.id;

    await request(app).post("/auth/login").send({
      email: adminEmail,
      password: adminPassword,
    });

    const agent = await getAgentWithScopes(app, ["users:read"]);

    const response = await agent.get("/users");

    expect(response.status).toBe(200);
    expect(response.body).toBeInstanceOf(Array);
    expect(response.body.length).toBe(2); // Expecting both users

    expect(response.body[0]).toMatchObject({
      id: userId,
      email: userEmail,
      createdAt: expect.any(String),
      lastLoginAt: null, // User hasn't logged in yet
    });
    expect(response.body[1]).toMatchObject({
      id: adminUserId,
      email: adminEmail,
      createdAt: expect.any(String),
      lastLoginAt: expect.any(String), // Admin logged in
    });

    // Verify sorting (user registered after admin should be first)
    const date1 = new Date(response.body[1].createdAt);
    const date0 = new Date(response.body[0].createdAt);
    expect(date0.getTime()).toBeGreaterThan(date1.getTime());
  });
});
