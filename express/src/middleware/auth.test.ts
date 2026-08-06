import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import express from "express";
import type { OpenAPIV3 } from "express-openapi-validator/dist/framework/types.ts";
import request from "supertest";
import {
  AUTH_ERROR_EMAIL_VERIFICATION_REQUIRED,
  AUTH_ERROR_MFA_REQUIRED,
} from "@saflib/sdk/auth-error-codes";
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
      mfaCompleted: false,
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
      mfaCompleted: false,
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
      code: AUTH_ERROR_EMAIL_VERIFICATION_REQUIRED,
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

const forbiddenSchemaProps = {
  error: { type: "string" as const },
  message: { type: "string" as const },
  code: { type: "string" as const },
};

describe("Auth Middleware email-verified OpenAPI tag", () => {
  /** Minimal spec with response bodies so express-openapi-validator accepts handler + auth errors. */
  const specWithEmailVerifiedTag: OpenAPIV3.DocumentV3 = {
    openapi: "3.0.0",
    info: { title: "test", version: "1.0.0" },
    paths: {
      "/tagged": {
        get: {
          tags: ["email-verified"],
          responses: {
            "200": {
              description: "ok",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: { ok: { type: "boolean" } },
                  },
                },
              },
            },
            "403": {
              description: "forbidden",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: forbiddenSchemaProps,
                  },
                },
              },
            },
          },
        },
      },
    },
  };

  it("returns 403 when operation has email-verified tag and email is not verified", async () => {
    const app = express();
    app.use(
      createScopedMiddleware({
        enforceAuth: true,
        apiSpec: specWithEmailVerifiedTag,
      }),
    );
    app.get("/tagged", (_req, res) => {
      res.status(200).json({ ok: true });
    });
    app.use(errorHandler);

    const response = await request(app).get("/tagged").set({
      "x-user-id": "123",
      "x-user-email": "test@example.com",
      "x-user-email-verified": "false",
    });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      error: "Forbidden",
      message: "Forbidden",
      code: AUTH_ERROR_EMAIL_VERIFICATION_REQUIRED,
    });
  });

  it("allows the request when operation has email-verified tag and email is verified", async () => {
    const app = express();
    app.use(
      createScopedMiddleware({
        enforceAuth: true,
        apiSpec: specWithEmailVerifiedTag,
      }),
    );
    app.get("/tagged", (_req, res) => {
      res.status(200).json({ ok: true });
    });
    app.use(errorHandler);

    const response = await request(app).get("/tagged").set({
      "x-user-id": "123",
      "x-user-email": "test@example.com",
      "x-user-email-verified": "true",
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });
});

describe("Auth Middleware mfa-required OpenAPI tag", () => {
  const specWithMfaTag: OpenAPIV3.DocumentV3 = {
    openapi: "3.0.0",
    info: { title: "test", version: "1.0.0" },
    paths: {
      "/mfa-route": {
        get: {
          tags: ["mfa-required"],
          responses: {
            "200": {
              description: "ok",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: { ok: { type: "boolean" } },
                  },
                },
              },
            },
            "403": {
              description: "forbidden",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: forbiddenSchemaProps,
                  },
                },
              },
            },
          },
        },
      },
    },
  };

  it("returns 403 MFA_REQUIRED when tag is present and session is not MFA-complete", async () => {
    const app = express();
    app.use(
      createScopedMiddleware({
        enforceAuth: true,
        apiSpec: specWithMfaTag,
      }),
    );
    app.get("/mfa-route", (_req, res) => {
      res.status(200).json({ ok: true });
    });
    app.use(errorHandler);

    const response = await request(app).get("/mfa-route").set({
      "x-user-id": "123",
      "x-user-email": "test@example.com",
      "x-user-email-verified": "true",
    });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      error: "Forbidden",
      message: "Forbidden",
      code: AUTH_ERROR_MFA_REQUIRED,
    });
  });

  it("allows the request when tag is present and x-user-mfa-completed is true", async () => {
    const app = express();
    app.use(
      createScopedMiddleware({
        enforceAuth: true,
        apiSpec: specWithMfaTag,
      }),
    );
    app.get("/mfa-route", (_req, res) => {
      res.status(200).json({ ok: true });
    });
    app.use(errorHandler);

    const response = await request(app).get("/mfa-route").set({
      "x-user-id": "123",
      "x-user-email": "test@example.com",
      "x-user-email-verified": "true",
      "x-user-mfa-completed": "true",
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });
});

describe("Auth Middleware site-admin-only OpenAPI tag", () => {
  const specWithSiteAdminTag: OpenAPIV3.DocumentV3 = {
    openapi: "3.0.0",
    info: { title: "test", version: "1.0.0" },
    paths: {
      "/admin-route": {
        get: {
          tags: ["site-admin-only"],
          responses: {
            "200": {
              description: "ok",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: { ok: { type: "boolean" } },
                  },
                },
              },
            },
            "403": {
              description: "forbidden",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: forbiddenSchemaProps,
                  },
                },
              },
            },
          },
        },
      },
    },
  };

  it("returns EMAIL_VERIFICATION_REQUIRED before admin role when site-admin-only and email unverified", async () => {
    const app = express();
    app.use(
      createScopedMiddleware({
        enforceAuth: true,
        apiSpec: specWithSiteAdminTag,
      }),
    );
    app.get("/admin-route", (_req, res) => {
      res.status(200).json({ ok: true });
    });
    app.use(errorHandler);

    const response = await request(app).get("/admin-route").set({
      "x-user-id": "123",
      "x-user-email": "admin@example.com",
      "x-user-email-verified": "false",
      "x-user-is-admin": "true",
    });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe(AUTH_ERROR_EMAIL_VERIFICATION_REQUIRED);
  });

  it("returns MFA_REQUIRED for site-admin-only when verified admin but no MFA", async () => {
    const app = express();
    app.use(
      createScopedMiddleware({
        enforceAuth: true,
        apiSpec: specWithSiteAdminTag,
      }),
    );
    app.get("/admin-route", (_req, res) => {
      res.status(200).json({ ok: true });
    });
    app.use(errorHandler);

    const response = await request(app).get("/admin-route").set({
      "x-user-id": "123",
      "x-user-email": "admin@example.com",
      "x-user-email-verified": "true",
      "x-user-is-admin": "true",
    });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      error: "Forbidden",
      message: "Forbidden",
      code: AUTH_ERROR_MFA_REQUIRED,
    });
  });

  it("allows site admin when email verified, isAdmin, and MFA complete", async () => {
    const app = express();
    app.use(
      createScopedMiddleware({
        enforceAuth: true,
        apiSpec: specWithSiteAdminTag,
      }),
    );
    app.get("/admin-route", (_req, res) => {
      res.status(200).json({ ok: true });
    });
    app.use(errorHandler);

    const response = await request(app).get("/admin-route").set({
      "x-user-id": "123",
      "x-user-email": "admin@example.com",
      "x-user-email-verified": "true",
      "x-user-is-admin": "true",
      "x-user-mfa-completed": "true",
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });

  it("returns 403 for non-admin users on site-admin-only routes", async () => {
    const app = express();
    app.use(
      createScopedMiddleware({
        enforceAuth: true,
        apiSpec: specWithSiteAdminTag,
      }),
    );
    app.get("/admin-route", (_req, res) => {
      res.status(200).json({ ok: true });
    });
    app.use(errorHandler);

    const response = await request(app).get("/admin-route").set({
      "x-user-id": "123",
      "x-user-email": "user@example.com",
      "x-user-email-verified": "true",
      "x-user-mfa-completed": "true",
    });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      error: "Forbidden",
      message: "Forbidden",
    });
  });
});

describe("Auth Middleware adminRequired option (deprecated)", () => {
  it("returns EMAIL_VERIFICATION_REQUIRED before admin role when adminRequired and email unverified", async () => {
    const app = express();
    app.use(
      createScopedMiddleware({
        enforceAuth: true,
        adminRequired: true,
      }),
    );
    app.get("/admin", (_req, res) => {
      res.status(200).json({ ok: true });
    });
    app.use(errorHandler);

    const response = await request(app).get("/admin").set({
      "x-user-id": "123",
      "x-user-email": "admin@example.com",
      "x-user-email-verified": "false",
      "x-user-is-admin": "true",
    });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe(AUTH_ERROR_EMAIL_VERIFICATION_REQUIRED);
  });

  it("returns MFA_REQUIRED for admin when verified admin but no MFA", async () => {
    const app = express();
    app.use(
      createScopedMiddleware({
        enforceAuth: true,
        adminRequired: true,
      }),
    );
    app.get("/admin", (_req, res) => {
      res.status(200).json({ ok: true });
    });
    app.use(errorHandler);

    const response = await request(app).get("/admin").set({
      "x-user-id": "123",
      "x-user-email": "admin@example.com",
      "x-user-email-verified": "true",
      "x-user-is-admin": "true",
    });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      error: "Forbidden",
      message: "Forbidden",
      code: AUTH_ERROR_MFA_REQUIRED,
    });
  });

  it("allows admin when email verified, isAdmin, and MFA complete", async () => {
    const app = express();
    app.use(
      createScopedMiddleware({
        enforceAuth: true,
        adminRequired: true,
      }),
    );
    app.get("/admin", (_req, res) => {
      res.status(200).json({ ok: true });
    });
    app.use(errorHandler);

    const response = await request(app).get("/admin").set({
      "x-user-id": "123",
      "x-user-email": "admin@example.com",
      "x-user-email-verified": "true",
      "x-user-is-admin": "true",
      "x-user-mfa-completed": "true",
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });
});

describe("Auth Middleware mfaRequired option", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("enforces MFA when mfaRequired is true without OpenAPI tag", async () => {
    const app = express();
    app.use(
      createScopedMiddleware({
        enforceAuth: true,
        mfaRequired: true,
      }),
    );
    app.get("/need-mfa", (_req, res) => {
      res.status(200).json({ ok: true });
    });
    app.use(errorHandler);

    const response = await request(app).get("/need-mfa").set({
      "x-user-id": "123",
      "x-user-email": "test@example.com",
      "x-user-email-verified": "true",
    });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe(AUTH_ERROR_MFA_REQUIRED);
  });

  it("skips MFA when DISABLE_MFA_ENFORCEMENT is true", async () => {
    vi.stubEnv("DISABLE_MFA_ENFORCEMENT", "true");

    const app = express();
    app.use(
      createScopedMiddleware({
        enforceAuth: true,
        mfaRequired: true,
      }),
    );
    app.get("/need-mfa", (_req, res) => {
      res.status(200).json({ ok: true });
    });
    app.use(errorHandler);

    const response = await request(app).get("/need-mfa").set({
      "x-user-id": "123",
      "x-user-email": "test@example.com",
      "x-user-email-verified": "true",
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });
});
