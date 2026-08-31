import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { DbKey } from "@saflib/drizzle";
import { createErrorMiddleware, makeAdminHeaders } from "@saflib/express";
import { appendAuditEvent } from "@saflib/audit-db/queries/audit-event/append";
import { auditDb } from "@saflib/audit-db/instances";
import { clearAuditEventsForTests } from "@saflib/audit-db/queries/audit-event/clear-for-tests";
import { createAuditLogsRouter } from "./createAuditLogsRouter.ts";

describe("createAuditLogsRouter", () => {
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
    app.use(createAuditLogsRouter({ getAuditDbKey: () => dbKey }));
    app.use(createErrorMiddleware());
    return app;
  }

  it("lists audit rows for site-admin", async () => {
    const res = await request(makeApp())
      .get("/audit-logs?order=desc")
      .set(makeAdminHeaders("admin-audit-1", "admin@example.com"))
      .expect(200);

    expect(res.body.audit_logs).toHaveLength(1);
    expect(res.body.audit_logs[0].event_type).toBe("audit.http.test");
    expect(res.body.head_at).toBeTruthy();
    expect(res.body.tail_at).toBeTruthy();
  });
});
