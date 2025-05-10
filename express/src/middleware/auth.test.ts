import { describe, it, expect, beforeEach } from "vitest";
import type { Request, Response } from "express";
import express from "express";
import request from "supertest";
import { createPreMiddleware } from "./composition.ts";
import { errorHandler } from "./errors.ts"; // Import errorHandler for a complete setup
import { safStorage } from "@saflib/node";

describe("Auth Middleware", () => {
  let app: express.Express;

  beforeEach(() => {
    app = express();
    app.use(createPreMiddleware({ authRequired: true }));
    app.get("/test", (_req: Request, res: Response) => {
      const { auth } = safStorage.getStore()!;
      res.status(200).json({ authFromMiddleware: auth });
    });
    app.use(errorHandler);
  });

  it("should populate auth object with user info and empty scopes when no scope header", async () => {
    const headers = {
      "x-user-id": "123",
      "x-user-email": "test@example.com",
    };

    const response = await request(app).get("/test").set(headers);

    expect(response.status).toBe(200);
    expect(response.body.authFromMiddleware).toEqual({
      userId: 123,
      userEmail: "test@example.com",
      scopes: [],
    });
  });

  it("should populate auth object with user info and scopes from header", async () => {
    const headers = {
      "x-user-id": "123",
      "x-user-email": "test@example.com",
      "x-user-scopes": "admin,write",
    };

    const response = await request(app).get("/test").set(headers);

    expect(response.status).toBe(200);
    expect(response.body.authFromMiddleware).toEqual({
      userId: 123,
      userEmail: "test@example.com",
      scopes: ["admin", "write"],
    });
  });

  it("should handle empty scopes header by returning empty array", async () => {
    const headers = {
      "x-user-id": "123",
      "x-user-email": "test@example.com",
      "x-user-scopes": "",
    };

    const response = await request(app).get("/test").set(headers);

    expect(response.status).toBe(200);
    expect(response.body.authFromMiddleware).toEqual({
      userId: 123,
      userEmail: "test@example.com",
      scopes: [],
    });
  });

  it("should return 401 when user ID is missing", async () => {
    const headers = {
      "x-user-email": "test@example.com",
      "x-user-scopes": "admin",
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
