import type { Express } from "express";
import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SafContext } from "@saflib/node";
import { safContextStorage } from "@saflib/node";
import * as safNode from "@saflib/node";
import * as auditDbModule from "@saflib/audit-db/queries/audit-event/append";
import { auditDb } from "@saflib/audit-db/instances";
import { listAuditEventsByTimestamp } from "@saflib/audit-db/queries/audit-event/list-by-timestamp";
import type { DbKey } from "@saflib/drizzle";
import { createErrorMiddleware } from "@saflib/express";
import type { AuditMapEntry } from "./audit-map.ts";
import { createAuditRecorder, type AuditRecorder } from "./audit-recorder.ts";
import { drainAuditRecorder } from "./audit-test-helpers.ts";

const testAuditMap: Record<string, AuditMapEntry> = {
  "GET /widgets/:id": { eventType: "widget.read", resourceType: "widget" },
  "DELETE /things/:thingId": {
    eventType: "thing.delete",
    resourceType: "thing",
    alsoEmitFor: ["other"],
    failClosed: true,
  },
  "GET /blocked/:id": {
    eventType: "blocked.read",
    resourceType: "widget",
  },
  "GET /boom/:id": {
    eventType: "widget.boom",
    resourceType: "widget",
  },
  "GET /not-modified/:id": {
    eventType: "widget.not_modified",
    resourceType: "widget",
  },
};

function mountTestApp(): {
  app: Express;
  auditKey: DbKey;
  recorder: AuditRecorder;
} {
  const app = express();
  const auditKey = auditDb.connect();
  const recorder = createAuditRecorder({
    getAuditDbKey: () => auditKey,
    auditMap: testAuditMap,
  });

  const saf: SafContext = {
    requestId: "audit-test-req",
    serviceName: "test",
    subsystemName: "http",
    operationName: "testOp",
    auth: { userId: "user-audit-1" },
    clientIp: "127.0.0.1",
    userAgent: "vitest",
  };

  app.use((_req, _res, next) => {
    safContextStorage.run(saf, () => next());
  });
  app.use(recorder.middleware());
  app.get("/widgets/:id", (_req, res) => {
    res.sendStatus(200);
  });
  app.get("/nomap", (_req, res) => {
    res.sendStatus(200);
  });
  app.delete("/things/:thingId", async (req, res, next) => {
    try {
      await recorder.appendFailClosedHttpAuditIfRequired(req, res, {
        responseStatusCode: 204,
      });
      res.sendStatus(204);
    } catch (err) {
      next(err);
    }
  });
  app.get("/blocked/:id", (_req, res) => {
    res.sendStatus(403);
  });
  app.get("/boom/:id", (_req, res) => {
    res.sendStatus(200);
  });
  app.get("/not-modified/:id", (_req, res) => {
    res.sendStatus(304);
  });

  app.use(createErrorMiddleware());

  return { app, auditKey, recorder };
}

describe("createAuditRecorder", () => {
  let auditKey: DbKey;
  let app: Express;
  let prevDeploymentName: string | undefined;

  beforeEach(() => {
    prevDeploymentName = process.env.DEPLOYMENT_NAME;
    process.env.DEPLOYMENT_NAME = "audit-http-test";
    ({ app, auditKey } = mountTestApp());
  });

  afterEach(() => {
    auditDb.disconnect(auditKey);
    vi.restoreAllMocks();
    if (prevDeploymentName === undefined) {
      delete process.env.DEPLOYMENT_NAME;
    } else {
      process.env.DEPLOYMENT_NAME = prevDeploymentName;
    }
  });

  it("writes one audit row for a mapped route (primary resource only)", async () => {
    const res = await request(app).get("/widgets/w1");
    expect(res.status).toBe(200);
    await drainAuditRecorder();

    const { result } = await listAuditEventsByTimestamp(auditKey, { limit: 50 });
    expect(result?.events).toHaveLength(1);
    const row = result!.events[0]!;
    expect(row.event_type).toBe("widget.read");
    expect(row.resource_type).toBe("widget");
    expect(row.resource_id).toBe("w1");
    expect(row.outcome).toBe("success");
  });

  it("writes no rows for an unmapped route", async () => {
    const res = await request(app).get("/nomap");
    expect(res.status).toBe(200);
    await drainAuditRecorder();

    const { result } = await listAuditEventsByTimestamp(auditKey, { limit: 50 });
    expect(result?.events).toHaveLength(0);
  });

  it("writes one row per resource_type for alsoEmitFor with shared request_id", async () => {
    const res = await request(app).delete("/things/t1");
    expect(res.status).toBe(204);
    await drainAuditRecorder();

    const { result } = await listAuditEventsByTimestamp(auditKey, { limit: 50 });
    expect(result?.events).toHaveLength(2);
    const types = result!.events.map((e) => e.resource_type).sort();
    expect(types).toEqual(["other", "thing"]);
    const requestIds = new Set(result!.events.map((e) => e.request_id));
    expect(requestIds.size).toBe(1);
    expect(requestIds.has("audit-test-req")).toBe(true);
    const otherRow = result!.events.find((e) => e.resource_type === "other");
    expect(otherRow?.resource_id).toBeNull();
  });

  it("records outcome success for 304 Not Modified", async () => {
    const res = await request(app).get("/not-modified/w1");
    expect(res.status).toBe(304);
    await drainAuditRecorder();

    const { result } = await listAuditEventsByTimestamp(auditKey, { limit: 50 });
    expect(result?.events).toHaveLength(1);
    expect(result!.events[0]!.outcome).toBe("success");
    const details = result!.events[0]!.details;
    expect(details?.source).toBe("http");
    if (details?.source === "http") {
      expect(details.status_code).toBe(304);
    }
  });

  it("records outcome denied for 403 responses", async () => {
    const res = await request(app).get("/blocked/b1");
    expect(res.status).toBe(403);
    await drainAuditRecorder();

    const { result } = await listAuditEventsByTimestamp(auditKey, { limit: 50 });
    expect(result?.events).toHaveLength(1);
    expect(result!.events[0]!.outcome).toBe("denied");
  });

  it("does not fail the HTTP response when appendAuditEvent throws; reports via logError", async () => {
    const logErrorSpy = vi.fn();
    vi.spyOn(safNode, "getSafReporters").mockReturnValue({
      log: { error: vi.fn() } as unknown as safNode.SafReporters["log"],
      logError: logErrorSpy,
    });

    vi.spyOn(auditDbModule, "appendAuditEvent").mockRejectedValueOnce(
      new Error("audit append failed"),
    );

    const res = await request(app).get("/boom/b1");
    expect(res.status).toBe(200);
    await drainAuditRecorder();
    expect(logErrorSpy).toHaveBeenCalledTimes(1);

    const { result } = await listAuditEventsByTimestamp(auditKey, { limit: 50 });
    expect(result?.events?.length ?? 0).toBe(0);
  });

  it("fail-closed route returns 503 when appendAuditEvent rejects", async () => {
    const logErrorSpy = vi.fn();
    vi.spyOn(safNode, "getSafReporters").mockReturnValue({
      log: { error: vi.fn() } as unknown as safNode.SafReporters["log"],
      logError: logErrorSpy,
    });

    vi.spyOn(auditDbModule, "appendAuditEvent").mockRejectedValueOnce(
      new Error("audit down"),
    );

    const res = await request(app).delete("/things/t1");
    expect(res.status).toBe(503);
    await drainAuditRecorder();

    const { result } = await listAuditEventsByTimestamp(auditKey, { limit: 50 });
    expect(result?.events?.length ?? 0).toBe(0);
  });
});
