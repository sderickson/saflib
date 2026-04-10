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
    app.use(createScopedMiddleware({ enforceAuth: true }));
    app.get("/test", (_req, res) => {
      const { auth } = getSafContext();
      res.status(200).json({ authFromMiddleware: auth });
    });
    app.use(errorHandler);
  });

  it("should populate auth object with user info and isAdmin false when no isAdmin header", async () => {
    const headers = {
      "x-user-id": "123",
      "x-user-email": "test@example.com",
      "x-user-email-verified": "true",
    };

    const response = await request(app).get("/test").set(headers);

    expect(response.status).toBe(200);
    expect(response.body.authFromMiddleware).toEqual({
      userId: "123",
      userEmail: "test@example.com",
      isAdmin: false,
      emailVerified: true,
    });
  });

  it("should populate auth object with user info and isAdmin true when isAdmin header is true", async () => {
    const headers = {
      "x-user-id": "123",
      "x-user-email": "test@example.com",
      "x-user-is-admin": "true",
      "x-user-email-verified": "true",
    };

    const response = await request(app).get("/test").set(headers);

    expect(response.status).toBe(200);
    expect(response.body.authFromMiddleware).toEqual({
      userId: "123",
      userEmail: "test@example.com",
      isAdmin: true,
      emailVerified: true,
    });
  });

  it("should return 401 when user ID is missing", async () => {
    const headers = {
      "x-user-email": "test@example.com",
      "x-user-is-admin": "true",
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
      "x-user-is-admin": "true",
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
      "x-user-is-admin": "true",
    };

    const response = await request(app).get("/test").set(headers);

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: "Unauthorized",
      message: "Unauthorized",
    });
  });
});

describe("Auth Middleware email verification", () => {
  it("returns 403 when emailVerificationRequired is true and email is not verified", async () => {
    const app = express();
    app.use(
      createScopedMiddleware({
        enforceAuth: true,
        emailVerificationRequired: true,
      }),
    );
    app.get("/test", (_req, res) => {
      res.status(200).json({ ok: true });
    });
    app.use(errorHandler);

    const response = await request(app).get("/test").set({
      "x-user-id": "123",
      "x-user-email": "test@example.com",
      "x-user-email-verified": "false",
    });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      error: "Forbidden",
      message: "Forbidden",
    });
  });

  it("allows the request when emailVerificationRequired is true and email is verified", async () => {
    const app = express();
    app.use(
      createScopedMiddleware({
        enforceAuth: true,
        emailVerificationRequired: true,
      }),
    );
    app.get("/test", (_req, res) => {
      const { auth } = getSafContext();
      res.status(200).json({ authFromMiddleware: auth });
    });
    app.use(errorHandler);

    const response = await request(app).get("/test").set({
      "x-user-id": "123",
      "x-user-email": "test@example.com",
      "x-user-email-verified": "true",
    });

    expect(response.status).toBe(200);
    expect(response.body.authFromMiddleware?.emailVerified).toBe(true);
  });
});
