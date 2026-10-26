import { describe, it, expect, afterEach, vi } from "vitest";

import express from "express";
import { asOpenApiDocument } from "@saflib/openapi";
import request from "supertest";
import {
  AUTH_ERROR_EMAIL_VERIFICATION_REQUIRED,
  AUTH_ERROR_MFA_REQUIRED,
} from "@saflib/utils/auth-error-codes";
import { createScopedMiddleware } from "./composition.ts";
import { errorHandler } from "./errors.ts";
import { getSafContext } from "@saflib/node";

const jsonBody = {
  "application/json": { schema: { type: "object" as const } },
};

/** One-operation app whose access is `security: [{ session: scopes }]`. */
function appWithSessionScopes(scopes: string[]) {
  const apiSpec = asOpenApiDocument({
    openapi: "3.1.0",
    info: { title: "test", version: "1.0.0" },
    paths: {
      "/test": {
        get: {
          operationId: "getTest",
          security: [{ session: scopes }],
          responses: {
            "200": { description: "ok", content: jsonBody },
            "401": { description: "unauthorized", content: jsonBody },
            "403": { description: "forbidden", content: jsonBody },
          },
        },
      },
    },
  });
  const app = express();
  app.use(createScopedMiddleware({ apiSpec }));
  app.get("/test", (_req, res) => {
    const { auth } = getSafContext();
    res.status(200).json({ authFromMiddleware: auth });
  });
  app.use(errorHandler);
  return app;
}

const user = {
  "x-user-id": "123",
  "x-user-email": "test@example.com",
};

describe("session security", () => {
  it("populates auth with isAdmin false when no isAdmin header", async () => {
    const response = await request(appWithSessionScopes([]))
      .get("/test")
      .set({ ...user, "x-user-email-verified": "true" });

    expect(response.status).toBe(200);
    expect(response.body.authFromMiddleware).toEqual({
      userId: "123",
      userEmail: "test@example.com",
      isAdmin: false,
      emailVerified: true,
      mfaCompleted: false,
    });
  });

  it("populates auth with isAdmin true when isAdmin header is true", async () => {
    const response = await request(appWithSessionScopes([]))
      .get("/test")
      .set({
        ...user,
        "x-user-is-admin": "true",
        "x-user-email-verified": "true",
      });

    expect(response.status).toBe(200);
    expect(response.body.authFromMiddleware.isAdmin).toBe(true);
  });

  it.each([
    ["user ID", { "x-user-email": "test@example.com" }],
    ["user email", { "x-user-id": "123" }],
    ["both user ID and email", {}],
  ])("returns 401 when %s is missing", async (_label, headers) => {
    const response = await request(appWithSessionScopes([]))
      .get("/test")
      .set({ ...headers, "x-user-is-admin": "true" });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: "Unauthorized",
      message: "Unauthorized",
    });
  });
});

describe("session scopes", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each([
    // [scopes, headers, status, code]
    [["email-verified"], { "x-user-email-verified": "false" }, 403, AUTH_ERROR_EMAIL_VERIFICATION_REQUIRED],
    [["email-verified"], { "x-user-email-verified": "true" }, 200, undefined],
    [["mfa"], { "x-user-email-verified": "true" }, 403, AUTH_ERROR_MFA_REQUIRED],
    [["mfa"], { "x-user-email-verified": "true", "x-user-mfa-completed": "true" }, 200, undefined],
    // site-admin implies verified email (checked first), then admin role, then MFA.
    [["site-admin"], { "x-user-email-verified": "false", "x-user-is-admin": "true" }, 403, AUTH_ERROR_EMAIL_VERIFICATION_REQUIRED],
    [["site-admin"], { "x-user-email-verified": "true", "x-user-mfa-completed": "true" }, 403, undefined],
    [["site-admin"], { "x-user-email-verified": "true", "x-user-is-admin": "true" }, 403, AUTH_ERROR_MFA_REQUIRED],
    [["site-admin"], { "x-user-email-verified": "true", "x-user-is-admin": "true", "x-user-mfa-completed": "true" }, 200, undefined],
  ] as const)(
    "%j with %j → %i %s",
    async (scopes, headers, status, code) => {
      const response = await request(appWithSessionScopes([...scopes]))
        .get("/test")
        .set({ ...user, ...headers });

      expect(response.status).toBe(status);
      if (code) {
        expect(response.body).toEqual({
          error: "Forbidden",
          message: "Forbidden",
          code,
        });
      }
    },
  );

  it("skips MFA when DISABLE_MFA_ENFORCEMENT is true", async () => {
    vi.stubEnv("DISABLE_MFA_ENFORCEMENT", "true");
    const response = await request(appWithSessionScopes(["mfa"]))
      .get("/test")
      .set({ ...user, "x-user-email-verified": "true" });

    expect(response.status).toBe(200);
  });
});
