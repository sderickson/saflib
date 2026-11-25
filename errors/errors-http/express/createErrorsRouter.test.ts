import { describe, it, expect, beforeEach, beforeAll, afterEach } from "vitest";
import express from "express";
import request from "supertest";
import { createErrorMiddleware } from "@saflib/express";
import {
  addReportedErrorSink,
  configureMockErrors,
  type ReportedErrorInput,
  listReportedErrors,
  recordReportedError,
  resetReportedErrorBufferForTests,
} from "@saflib/errors-service";
import { createDevErrorsRouter, createErrorsRouter } from "./createErrorsRouter.ts";

const siteAdminHeaders = {
  "x-requested-with": "XMLHttpRequest",
  "x-user-id": "admin-1",
  "x-user-email": "admin@example.com",
  "x-user-email-verified": "true",
  "x-user-is-admin": "true",
  "x-user-mfa-completed": "true",
} as const;

describe("errors routers", () => {
  const originalDeployment = process.env.DEPLOYMENT_NAME;
  const sunk: ReportedErrorInput[] = [];

  beforeAll(() => {
    configureMockErrors();
    addReportedErrorSink((input) => sunk.push(input));
  });

  beforeEach(() => {
    process.env.DEPLOYMENT_NAME = "development";
    resetReportedErrorBufferForTests();
    sunk.length = 0;
  });

  afterEach(() => {
    if (originalDeployment === undefined) {
      delete process.env.DEPLOYMENT_NAME;
    } else {
      process.env.DEPLOYMENT_NAME = originalDeployment;
    }
  });

  function makeApp() {
    const app = express();
    app.use(express.json());
    app.use(createErrorsRouter());
    app.use(createDevErrorsRouter());
    app.use(createErrorMiddleware());
    return app;
  }

  it("records client errors via POST and lists them for site admins", async () => {
    await request(makeApp())
      .post("/errors/record")
      .set("x-requested-with", "XMLHttpRequest")
      .send({
        reported_error: {
          kind: "client",
          message: "Vue render failed",
          stack: "Error: Vue render failed\n    at ...",
          source: "web-admin",
        },
      })
      .expect(204);

    recordReportedError({
      kind: "server",
      message: "Unhandled exception",
      source: "http",
    });

    const res = await request(makeApp())
      .get("/admin/errors")
      .set(siteAdminHeaders)
      .expect(200);

    expect(res.body.reported_errors).toHaveLength(2);
    expect(res.body.reported_errors[0]).toMatchObject({
      kind: "client",
      message: "Vue render failed",
      source: "web-admin",
    });
    expect(res.body.reported_errors[1]).toMatchObject({
      kind: "server",
      source: "http",
    });
    expect(listReportedErrors()).toHaveLength(2);
  });

  it("normalizes CSP violation reports into the same buffer", async () => {
    await request(makeApp())
      .post("/csp-violations")
      .set("x-requested-with", "XMLHttpRequest")
      .send({
        "csp-report": {
          "document-uri": "https://app.example/",
          "violated-directive": "img-src",
        },
      })
      .expect(204);

    const res = await request(makeApp())
      .get("/admin/errors")
      .set(siteAdminHeaders)
      .expect(200);

    expect(res.body.reported_errors).toHaveLength(1);
    expect(res.body.reported_errors[0]).toMatchObject({
      kind: "csp-violation",
      source: "browser",
    });
  });

  it("titles CSP reports by directive, blocked origin and page, and sends them to sinks", async () => {
    await request(makeApp())
      .post("/csp-violations")
      .set("content-type", "application/csp-report")
      .send(
        JSON.stringify({
          "csp-report": {
            "document-uri": "https://admin.example/ops/metrics?q=up",
            "effective-directive": "img-src",
            "violated-directive": "img-src 'self' data:",
            "blocked-uri": "https://api.example/ops/metrics/graph.png?sig=abc123",
          },
        }),
      )
      .expect(204);

    expect(sunk).toHaveLength(1);
    expect(sunk[0]).toMatchObject({
      kind: "csp-violation",
      message: "CSP img-src blocked https://api.example on admin.example",
      fingerprint: "csp:img-src:https://api.example:admin.example",
    });
  });

  it("accepts Reporting API batches", async () => {
    await request(makeApp())
      .post("/csp-violations")
      .set("content-type", "application/reports+json")
      .send(
        JSON.stringify([
          { type: "csp-violation", body: { documentURL: "https://app.example/x", effectiveDirective: "script-src-elem", blockedURL: "inline" } },
          { type: "csp-violation", body: { documentURL: "https://app.example/y", effectiveDirective: "connect-src", blockedURL: "wss://evil.example/s" } },
        ]),
      )
      .expect(204);

    expect(sunk.map((s) => s.message)).toEqual([
      "CSP script-src-elem blocked inline on app.example",
      "CSP connect-src blocked wss://evil.example on app.example",
    ]);
  });

  it("records admin test errors as kind test", async () => {
    await request(makeApp())
      .post("/admin/test-error")
      .set(siteAdminHeaders)
      .expect(500);

    const res = await request(makeApp())
      .get("/admin/errors")
      .query({ kind: "test" })
      .set(siteAdminHeaders)
      .expect(200);

    expect(res.body.reported_errors).toHaveLength(1);
    expect(res.body.reported_errors[0].message).toContain(
      "Intentional admin test error",
    );
  });

  it("returns 500 outside development (mis-mounted dev handler)", async () => {
    process.env.DEPLOYMENT_NAME = "production";
    await request(makeApp()).get("/admin/errors").expect(500);
  });

  it("lists buffered errors without auth (dev ring buffer)", async () => {
    recordReportedError({
      kind: "client",
      message: "no session required",
      source: "web-app",
    });

    const res = await request(makeApp()).get("/admin/errors").expect(200);

    expect(res.body.reported_errors).toHaveLength(1);
    expect(res.body.reported_errors[0].message).toBe("no session required");
  });

  it("filters listed errors by kind", async () => {
    recordReportedError({
      kind: "client",
      message: "client",
      source: "web-app",
    });
    recordReportedError({
      kind: "server",
      message: "server",
      source: "http",
    });

    const res = await request(makeApp())
      .get("/admin/errors")
      .query({ kind: "client" })
      .set(siteAdminHeaders)
      .expect(200);

    expect(res.body.reported_errors).toHaveLength(1);
    expect(res.body.reported_errors[0].kind).toBe("client");
  });
});
