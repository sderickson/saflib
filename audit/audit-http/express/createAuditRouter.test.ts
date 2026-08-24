import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { DbKey } from "@saflib/drizzle";
import { createErrorMiddleware, makeAdminHeaders } from "@saflib/express";
import {
  appendAuditEvent,
  auditDb,
  clearAuditEventsForTests,
} from "@saflib/audit-db";
import { createAuditRouter } from "./createAuditRouter.ts";

describe("createAuditRouter", () => {
  let dbKey: DbKey;
  let prevDeploymentName: string | undefined;

  beforeEach(async () => {
    prevDeploymentName = process.env.DEPLOYMENT_NAME;
    process.env.DEPLOYMENT_NAME = "audit-http-test";
    process.env.ADMIN_EMAILS = "admin@example.com";
    dbKey = auditDb.connect();
    await clearAuditEventsForTests(dbKey);
    await appendAuditEvent(dbKey, {
      ts: new Date("2026-06-01T12:00:00.000Z"),
      source: "system",
      event_type: "audit.http.test",
      outcome: "success",
      details: { source: "system", operation: "list-test" },
    });
  });

  afterEach(() => {
    auditDb.disconnect(dbKey);
    if (prevDeploymentName === undefined) {
      delete process.env.DEPLOYMENT_NAME;
    } else {
      process.env.DEPLOYMENT_NAME = prevDeploymentName;
    }
  });

  function makeApp() {
    const app = express();
    app.use(createAuditRouter({ getAuditDbKey: () => dbKey }));
    app.use(createErrorMiddleware());
    return app;
  }

  it("lists audit rows with chainValid true for a valid chain", async () => {
    const res = await request(makeApp())
      .get("/audit-logs?order=desc")
      .set(makeAdminHeaders("admin-audit-1", "admin@example.com"))
      .expect(200);

    expect(res.body.auditLogs).toHaveLength(1);
    expect(res.body.auditLogs[0].eventType).toBe("audit.http.test");
    expect(res.body.chainValid).toBe(true);
    expect(res.body.headAt).toBeTruthy();
    expect(res.body.tailAt).toBeTruthy();
  });
});
