import { describe, it, expect, beforeEach } from "vitest";

import express from "express";
import request from "supertest";
import { createScopedMiddleware } from "./composition.ts";
import { errorHandler } from "./errors.ts"; // Import errorHandler for a complete setup
import { getSafContext } from "@saflib/node";

describe("Auth Middleware", () => {
  let app: express.Express;

  beforeEach(() => {
    app = express();
    app.use(createScopedMiddleware({ authRequired: true }));
    app.get("/test", (_req, res) => {
      const { auth } = getSafContext();
      res.status(200).json({ authFromMiddleware: auth });
    });
    app.use(errorHandler);
  });

  it("should populate auth object with user info and empty scopes when no scope header", async () => {
    const headers = {
      "x-user-id": "123",
      "x-user-email": "test@example.com",
      "x-user-email-verified": "true",
      "x-user-scopes": "",
    };

    const response = await request(app).get("/test").set(headers);

    expect(response.status).toBe(200);
    expect(response.body.authFromMiddleware).toEqual({
      userId: "123",
      userEmail: "test@example.com",
      userScopes: [],
    });
  });

  it("should populate auth object with user info and scopes from header", async () => {
    const headers = {
      "x-user-id": "123",
      "x-user-email": "test@example.com",
      "x-user-scopes": "admin,write",
      "x-user-email-verified": "true",
    };

    const response = await request(app).get("/test").set(headers);

    expect(response.status).toBe(200);
    expect(response.body.authFromMiddleware).toEqual({
      userId: "123",
      userEmail: "test@example.com",
      userScopes: ["admin", "write"],
    });
  });

  it("should handle empty scopes header by returning empty array", async () => {
    const headers = {
      "x-user-id": "123",
      "x-user-email": "test@example.com",
      "x-user-scopes": "",
      "x-user-email-verified": "true",
    };

    const response = await request(app).get("/test").set(headers);

    expect(response.status).toBe(200);
    expect(response.body.authFromMiddleware).toEqual({
      userId: "123",
      userEmail: "test@example.com",
      userScopes: [],
    });
  });

  it("should return 401 when user ID is missing", async () => {
    const headers = {
      "x-user-email": "test@example.com",
      "x-user-scopes": "admin",
      "x-user-email-verified": "true",
    };

    const response = await request(app).get("/test").set(headers);
    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: "Unauthorized",
      message: "Unauthorized",
    });
  });

  it("should return 401 when user email is missing", async () => {
    const headers = {
      "x-user-id": "123",
      "x-user-scopes": "admin",
    };

    const response = await request(app).get("/test").set(headers);

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: "Unauthorized",
      message: "Unauthorized",
    });
  });

  it("should return 401 when both user ID and email are missing", async () => {
    const headers = {
      "x-user-scopes": "admin",
    };

    const response = await request(app).get("/test").set(headers);

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: "Unauthorized",
      message: "Unauthorized",
    });
  });
});
