import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import express from "express";
import request from "supertest";
import {
  createErrorMiddleware,
  makeAdminHeaders,
} from "@saflib/express";
import {
  listReportedErrors,
  recordReportedError,
  resetReportedErrorBufferForTests,
} from "../lib/reportedErrorBuffer.ts";
import { installReportedErrorCollector } from "../lib/initErrorsServer.ts";
import { createErrorsRouter } from "./createErrorsRouter.ts";

describe("createErrorsRouter", () => {
  beforeAll(() => {
    installReportedErrorCollector();
  });

  beforeEach(() => {
    resetReportedErrorBufferForTests();
    process.env.ADMIN_EMAILS = "admin@example.com";
  });

  function makeApp() {
    const app = express();
    app.use(express.json());
    app.use(createErrorsRouter());
    app.use(createErrorMiddleware());
    return app;
  }

  it("records client errors via POST and lists them for site admins", async () => {
    await request(makeApp())
      .post("/errors/record")
      .set("x-requested-with", "XMLHttpRequest")
      .send({
        reportedError: {
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
      .set(makeAdminHeaders("admin-1", "admin@example.com"))
      .expect(200);

    expect(res.body.reportedErrors).toHaveLength(2);
    expect(res.body.reportedErrors[0]).toMatchObject({
      kind: "client",
      message: "Vue render failed",
      source: "web-admin",
    });
    expect(res.body.reportedErrors[1]).toMatchObject({
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
      .set(makeAdminHeaders("admin-1", "admin@example.com"))
      .expect(200);

    expect(res.body.reportedErrors).toHaveLength(1);
    expect(res.body.reportedErrors[0]).toMatchObject({
      kind: "csp-violation",
      source: "browser",
    });
  });

  it("records admin test errors as kind test", async () => {
    await request(makeApp())
      .post("/admin/test-error")
      .set(makeAdminHeaders("admin-1", "admin@example.com"))
      .expect(500);

    const res = await request(makeApp())
      .get("/admin/errors")
      .query({ kind: "test" })
      .set(makeAdminHeaders("admin-1", "admin@example.com"))
      .expect(200);

    expect(res.body.reportedErrors).toHaveLength(1);
    expect(res.body.reportedErrors[0].message).toContain(
      "Intentional admin test error",
    );
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
      .set(makeAdminHeaders("admin-1", "admin@example.com"))
      .expect(200);

    expect(res.body.reportedErrors).toHaveLength(1);
    expect(res.body.reportedErrors[0].kind).toBe("client");
  });

  it("returns 403 for non-admin list requests", async () => {
    await request(makeApp())
      .get("/admin/errors")
      .set({
        "x-user-id": "user-1",
        "x-user-email": "user@example.com",
        "x-user-email-verified": "true",
        "x-user-is-admin": "false",
        "x-user-mfa-completed": "true",
        "x-requested-with": "XMLHttpRequest",
      })
      .expect(403);
  });
});
