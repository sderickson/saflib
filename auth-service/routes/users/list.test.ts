import { createApp } from "../../app.ts";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";
import express from "express";
import { AuthDB } from "@saflib/auth-db"; // Import AuthDB for mocking

// Mock the database interactions
const mockGetAll = vi.fn();
const mockGetEmailAuthByUserIds = vi.fn();
const mockDb = {
  users: {
    getAll: mockGetAll,
    getEmailAuthByUserIds: mockGetEmailAuthByUserIds,
    // Add other methods if needed by other parts of app setup
  },
  emailAuth: {
    // Add methods if needed
  },
  permissions: {
    // Add methods if needed
  },
} as unknown as AuthDB; // Type assertion for mock

// Mock user headers
const adminHeaders = {
  "x-user-id": "1",
  "x-user-email": "admin@example.com",
  "x-user-scopes": "admin", // Admin user
};

const nonAdminHeaders = {
  "x-user-id": "2",
  "x-user-email": "user@example.com",
  "x-user-scopes": "read", // Non-admin user
};

describe("GET /users Route", () => {
  let app: express.Express;

  beforeEach(() => {
    // Create app with mocked DB instance
    app = createApp({ db: mockDb });
    vi.clearAllMocks(); // Clear mocks before each test
  });

  afterEach(() => {
    // Optional: Additional cleanup if needed
  });

  it("should return 401 if user is not authenticated", async () => {
    const response = await request(app).get("/users");
    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Unauthorized"); // Adjust error message based on actual auth middleware response
  });

  it("should return 403 if user is not an admin", async () => {
    const response = await request(app).get("/users").set(nonAdminHeaders);
    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      error: "Forbidden: Requires admin scope",
    });
  });

  it("should return a sorted list of users for an admin", async () => {
    const now = new Date();
    const later = new Date(now.getTime() + 1000);
    const mockUsers = [
      { id: 1, createdAt: now, lastLoginAt: now, email: "user1@test.com" }, // Older
      { id: 2, createdAt: later, lastLoginAt: null, email: "user2@test.com" }, // Newer
    ];
    const mockEmailAuths = [
      { userId: 1, email: "user1@test.com" },
      { userId: 2, email: "user2@test.com" },
    ];

    mockGetAll.mockResolvedValue(mockUsers);
    mockGetEmailAuthByUserIds.mockResolvedValue(mockEmailAuths);

    const response = await request(app).get("/users").set(adminHeaders);

    expect(response.status).toBe(200);
    expect(mockGetAll).toHaveBeenCalledTimes(1);
    expect(mockGetEmailAuthByUserIds).toHaveBeenCalledWith([1, 2]);
    expect(response.body).toEqual([
      {
        id: 2,
        createdAt: later.toISOString(), // Expect ISO string
        lastLoginAt: null,
        email: "user2@test.com",
      },
      {
        id: 1,
        createdAt: now.toISOString(), // Expect ISO string
        lastLoginAt: now.toISOString(), // Expect ISO string
        email: "user1@test.com",
      },
    ]);
  });

  it("should handle users with missing email auth entries", async () => {
    const now = new Date();
    const mockUsers = [
      { id: 1, createdAt: now, lastLoginAt: now, email: "user1@test.com" },
      { id: 3, createdAt: now, lastLoginAt: null, email: "user3@test.com" }, // User 3 has no email auth entry
    ];
    const mockEmailAuths = [{ userId: 1, email: "user1@test.com" }]; // Only email for user 1

    mockGetAll.mockResolvedValue(mockUsers);
    mockGetEmailAuthByUserIds.mockResolvedValue(mockEmailAuths);

    const response = await request(app).get("/users").set(adminHeaders);

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      {
        id: 1,
        createdAt: now.toISOString(),
        lastLoginAt: now.toISOString(),
        email: "user1@test.com",
      },
      {
        id: 3,
        createdAt: now.toISOString(),
        lastLoginAt: null,
        email: "Error: Email not found for user 3", // Check fallback message
      },
    ]);
  });
});
