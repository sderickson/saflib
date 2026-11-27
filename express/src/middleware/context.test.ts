import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import express from "express";
import request from "supertest";
import { AuthenticatorAssuranceLevel } from "@ory/client";
import { getSafContext } from "@saflib/node";
import { makeContextMiddleware } from "./context.ts";
import { makeAuthMiddleware } from "./auth.ts";
import { errorHandler } from "./errors.ts";

function sessionResponse(overrides: {
  id?: string;
  email?: string;
  emailVerified?: boolean;
  aal?: AuthenticatorAssuranceLevel;
}) {
  const email = overrides.email ?? "user@example.com";
  return {
    identity: {
      id: overrides.id ?? "identity-1",
      traits: { email },
      verifiable_addresses: [
        { via: "email", verified: overrides.emailVerified ?? true },
      ],
    },
    authenticator_assurance_level:
      overrides.aal ?? AuthenticatorAssuranceLevel.Aal2,
  };
}

describe("makeContextMiddleware Kratos session re-validation", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function appWithAuth() {
    const app = express();
    app.use(makeContextMiddleware());
    app.use(makeAuthMiddleware());
    app.get("/protected", (_req, res) => {
      res.status(200).json({ userId: getSafContext().auth?.userId ?? null });
    });
    app.use(errorHandler);
    return app;
  }

  it("treats Kratos whoami 401 as anonymous (401, not 502)", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 401 }));

    const res = await request(appWithAuth())
      .get("/protected")
      .set("x-kratos-authenticated-identity-id", "identity-1")
      .set("Cookie", "ory_kratos_session=expired");

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      error: "Unauthorized",
      message: "Unauthorized",
    });
  });

  it("treats Kratos whoami 403 as anonymous", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 403 }));

    const res = await request(appWithAuth())
      .get("/protected")
      .set("x-kratos-authenticated-identity-id", "identity-1");

    expect(res.status).toBe(401);
  });

  it("still returns 502 when Kratos whoami fails with an unexpected status", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 500 }));

    const res = await request(appWithAuth())
      .get("/protected")
      .set("x-kratos-authenticated-identity-id", "identity-1");

    expect(res.status).toBe(502);
    expect(res.body.message).toContain("Kratos session lookup failed: 500");
  });

  it("resolves auth when whoami succeeds", async () => {
    vi.mocked(fetch).mockResolvedValue(
      Response.json(sessionResponse({ id: "identity-ok" })),
    );

    const res = await request(appWithAuth())
      .get("/protected")
      .set("x-kratos-authenticated-identity-id", "identity-ok")
      .set("Cookie", "ory_kratos_session=valid");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ userId: "identity-ok" });
  });

  it("fetches the Kratos session once when context middleware runs repeatedly", async () => {
    vi.mocked(fetch).mockResolvedValue(
      Response.json(sessionResponse({ id: "identity-once" })),
    );

    const app = express();
    app.use(makeContextMiddleware());
    app.use(makeContextMiddleware());
    app.get("/protected", makeContextMiddleware(), (_req, res) => {
      res.status(200).json({ userId: getSafContext().auth?.userId ?? null });
    });
    app.use(errorHandler);

    const res = await request(app)
      .get("/protected")
      .set("x-kratos-authenticated-identity-id", "identity-once")
      .set("Cookie", "ory_kratos_session=valid");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ userId: "identity-once" });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("looks up the session from the cookie alone when the edge didn't stamp a header", async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json(sessionResponse({ id: "identity-cookie" })));
    const res = await request(appWithAuth()).get("/protected").set("Cookie", "theme=dark; ory_kratos_session=valid");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ userId: "identity-cookie" });
    expect(vi.mocked(fetch).mock.calls[0]![1]).toMatchObject({ headers: { Cookie: "theme=dark; ory_kratos_session=valid" } });
  });

  it("recognizes a custom session cookie name (stacks sharing a domain name theirs)", async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json(sessionResponse({ id: "identity-custom" })));
    const res = await request(appWithAuth()).get("/protected").set("Cookie", "theme=dark; myapp_dev_session=valid");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ userId: "identity-custom" });
  });

  it("doesn't call Kratos without a header or session cookie", async () => {
    const res = await request(appWithAuth()).get("/protected").set("Cookie", "theme=dark");
    expect(res.status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("makeContextMiddleware request ids", () => {
  function appEchoingRequestId() {
    const app = express();
    app.use(makeContextMiddleware());
    app.get("/id", (_req, res) => {
      res.status(200).json({ requestId: getSafContext().requestId });
    });
    return app;
  }

  it("uses the edge's X-Request-ID when present", async () => {
    const res = await request(appEchoingRequestId()).get("/id").set("x-request-id", "edge-123");
    expect(res.body.requestId).toBe("edge-123");
  });

  it("gives each request without one its own id (callers that skip the edge)", async () => {
    const app = appEchoingRequestId();
    const a = await request(app).get("/id");
    const b = await request(app).get("/id");
    expect(a.body.requestId).toMatch(/^[0-9a-f-]{36}$/);
    expect(b.body.requestId).not.toBe(a.body.requestId);
  });
});
