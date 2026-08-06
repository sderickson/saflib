import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import type { OpenAPIV3 } from "express-openapi-validator/dist/framework/types.ts";
import request from "supertest";
import { getSafContext, signAssertion } from "@saflib/node";
import { createScopedMiddleware } from "./composition.ts";
import { errorHandler } from "./errors.ts";
import { markInternal } from "../markInternal.ts";
import { makeAssertionHeaders, makeUserHeaders } from "../vitest-helpers.ts";

const TEST_SECRET = Buffer.from("express-assertion-test-secret").toString(
  "base64",
);
const TEST_KEYS = `test:${TEST_SECRET}`;

const errorSchemaProps = {
  message: { type: "string" as const },
  status: { type: "number" as const },
  code: { type: "string" as const },
};

const probeSpec: OpenAPIV3.DocumentV3 = {
  openapi: "3.0.0",
  info: { title: "assertion-auth", version: "1.0.0" },
  paths: {
    "/probe": {
      get: {
        operationId: "probeOperation",
        responses: {
          "200": {
            description: "ok",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    auth: { type: "object", nullable: true },
                    requestId: { type: "string" },
                  },
                },
              },
            },
          },
          "401": {
            description: "unauthorized",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: errorSchemaProps,
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
                  properties: {
                    error: { type: "string" },
                    message: { type: "string" },
                    code: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/admin-probe": {
      get: {
        operationId: "adminProbeOperation",
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
          "401": {
            description: "unauthorized",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: errorSchemaProps,
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
                  properties: {
                    error: { type: "string" },
                    message: { type: "string" },
                    code: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function makeApp(options: { enforceAuth?: boolean } = {}) {
  const app = express();
  app.use(
    createScopedMiddleware({
      apiSpec: probeSpec,
      enforceAuth: options.enforceAuth ?? true,
    }),
  );
  app.get("/probe", (_req, res) => {
    const ctx = getSafContext();
    res.status(200).json({ auth: ctx.auth ?? null, requestId: ctx.requestId });
  });
  app.get("/admin-probe", (_req, res) => {
    res.status(200).json({ ok: true });
  });
  app.use(errorHandler);
  return app;
}

function mockActiveIdentity(overrides: {
  id?: string;
  email?: string;
  isAdminEmail?: boolean;
} = {}) {
  const id = overrides.id ?? "user-1";
  const email = overrides.email ?? "user@example.com";
  vi.mocked(globalThis.fetch).mockResolvedValue(
    jsonResponse(200, {
      id,
      state: "active",
      traits: { email },
      verifiable_addresses: [{ via: "email", verified: true }],
    }),
  );
}

describe("assertion auth path", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch");
    vi.stubEnv("SAF_INTERNAL_ASSERTION_KEYS", TEST_KEYS);
    vi.stubEnv("KRATOS_ADMIN_API_URL", "http://kratos:4434");
    vi.stubEnv("ADMIN_EMAILS", "admin@example.com");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("executes as the asserted user on an internal listener", async () => {
    mockActiveIdentity({ id: "user-1", email: "user@example.com" });
    const app = makeApp();
    const headers = makeAssertionHeaders(
      { userId: "user-1", mfaCompleted: true },
      { operationId: "probeOperation", requestId: "from-assertion" },
    );

    const res = await request(markInternal(app)).get("/probe").set(headers);

    expect(res.status).toBe(200);
    expect(res.body.auth).toEqual({
      userId: "user-1",
      userEmail: "user@example.com",
      userPhone: undefined,
      isAdmin: false,
      emailVerified: true,
      mfaCompleted: true,
    });
    expect(res.body.requestId).toBe("from-assertion");
    expect(globalThis.fetch).toHaveBeenCalled();
  });

  it("enforces site-admin-only against the resolved Auth", async () => {
    mockActiveIdentity({ id: "user-1", email: "user@example.com" });
    const app = makeApp();
    const headers = makeAssertionHeaders(
      { userId: "user-1", mfaCompleted: true },
      { operationId: "adminProbeOperation" },
    );

    const denied = await request(markInternal(app))
      .get("/admin-probe")
      .set(headers);
    expect(denied.status).toBe(403);

    mockActiveIdentity({ id: "admin-1", email: "admin@example.com" });
    const adminHeaders = makeAssertionHeaders(
      { userId: "admin-1", mfaCompleted: true },
      { operationId: "adminProbeOperation" },
    );
    const allowed = await request(markInternal(app))
      .get("/admin-probe")
      .set(adminHeaders);
    expect(allowed.status).toBe(200);
    expect(allowed.body).toEqual({ ok: true });
  });

  it("returns 401 assertion_invalid on operationId mismatch", async () => {
    mockActiveIdentity();
    const app = makeApp();
    const headers = makeAssertionHeaders(
      { userId: "user-1" },
      { operationId: "wrongOperation" },
    );

    const res = await request(markInternal(app)).get("/probe").set(headers);

    expect(res.status).toBe(401);
    expect(res.body.code).toBe("assertion_invalid");
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("returns 401 assertion_invalid for an expired token", async () => {
    mockActiveIdentity();
    const issuedAt = Date.now() - 40_000;
    const token = signAssertion({
      userId: "user-1",
      targetOperationId: "probeOperation",
      issuedAt,
      expiresAt: issuedAt + 30_000,
    });
    const app = makeApp();

    const res = await request(markInternal(app))
      .get("/probe")
      .set({ "x-saf-identity-assertion": token });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe("assertion_invalid");
  });

  it("returns 401 assertion_invalid for a forged token", async () => {
    mockActiveIdentity();
    const app = makeApp();
    const headers = makeAssertionHeaders(
      { userId: "user-1" },
      { operationId: "probeOperation" },
    );
    const [payload, , keyId] = headers["x-saf-identity-assertion"].split(".");
    const forged = `${payload}.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA.${keyId}`;

    const res = await request(markInternal(app))
      .get("/probe")
      .set({ "x-saf-identity-assertion": forged });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe("assertion_invalid");
  });

  it("returns 401 auth_unresolvable when the identity cannot be resolved", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      jsonResponse(404, { error: "Not Found" }),
    );
    const app = makeApp();
    const headers = makeAssertionHeaders(
      { userId: "missing" },
      { operationId: "probeOperation" },
    );

    const res = await request(markInternal(app)).get("/probe").set(headers);

    expect(res.status).toBe(401);
    expect(res.body.code).toBe("auth_unresolvable");
  });

  it("ignores assertion headers on the public (un-marked) listener", async () => {
    mockActiveIdentity({ id: "user-1", email: "user@example.com" });
    const app = makeApp({ enforceAuth: false });
    const headers = makeAssertionHeaders(
      { userId: "user-1", mfaCompleted: true },
      { operationId: "probeOperation" },
    );

    const res = await request(app).get("/probe").set(headers);

    expect(res.status).toBe(200);
    expect(res.body.auth).toBeNull();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("falls through to normal resolution when internal and no assertion", async () => {
    const app = makeApp();
    const headers = makeUserHeaders("test-user", "test@example.com");

    const res = await request(markInternal(app)).get("/probe").set(headers);

    expect(res.status).toBe(200);
    expect(res.body.auth).toMatchObject({
      userId: "test-user",
      userEmail: "test@example.com",
    });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("defers assertion resolution until OpenAPI has bound an operationId", async () => {
    mockActiveIdentity({ id: "user-1", email: "user@example.com" });
    // No apiSpec → no operationId on the request; early context must not 401.
    const app = express();
    app.use(createScopedMiddleware({ enforceAuth: false }));
    app.get("/probe", (_req, res) => {
      const ctx = getSafContext();
      res.status(200).json({ auth: ctx.auth ?? null });
    });
    app.use(errorHandler);

    const headers = makeAssertionHeaders(
      { userId: "user-1", mfaCompleted: true },
      { operationId: "probeOperation" },
    );
    const res = await request(markInternal(app)).get("/probe").set(headers);
    expect(res.status).toBe(200);
    expect(res.body.auth).toBeNull();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
