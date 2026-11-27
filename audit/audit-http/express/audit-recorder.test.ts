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
  "GET /cleared/:id": {
    eventType: "widget.cleared",
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
  // Express leaves `req.params` unset once a request falls out of its router
  // (e.g. an error that reaches the final handler).
  app.get("/cleared/:id", (req, res) => {
    for (const key of ["params", "query"]) {
      Object.defineProperty(req, key, {
        get: () => undefined,
        set: () => {},
        configurable: true,
      });
    }
    res.sendStatus(500);
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

    const { result } = await listAuditEventsByTimestamp(auditKey, {
      limit: 50,
    });
    expect(result?.events).toHaveLength(1);
    const row = result!.events[0]!;
    expect(row.event_type).toBe("widget.read");
    expect(row.resource_type).toBe("widget");
    expect(row.resource_id).toBe("w1");
    expect(row.outcome).toBe("success");
  });

  it("still writes the row when req.params and req.query are unset", async () => {
    const res = await request(app).get("/cleared/c1");
    expect(res.status).toBe(500);
    await drainAuditRecorder();

    const { result } = await listAuditEventsByTimestamp(auditKey, {
      limit: 50,
    });
    expect(result?.events).toHaveLength(1);
    expect(result!.events[0]!.event_type).toBe("widget.cleared");
    expect(result!.events[0]!.resource_id).toBe("c1");
  });

  it("writes no rows for an unmapped route", async () => {
    const res = await request(app).get("/nomap");
    expect(res.status).toBe(200);
    await drainAuditRecorder();

    const { result } = await listAuditEventsByTimestamp(auditKey, {
      limit: 50,
    });
    expect(result?.events).toHaveLength(0);
  });

  it("writes one row per resource_type for alsoEmitFor with shared request_id", async () => {
    const res = await request(app).delete("/things/t1");
    expect(res.status).toBe(204);
    await drainAuditRecorder();

    const { result } = await listAuditEventsByTimestamp(auditKey, {
      limit: 50,
    });
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

    const { result } = await listAuditEventsByTimestamp(auditKey, {
      limit: 50,
    });
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

    const { result } = await listAuditEventsByTimestamp(auditKey, {
      limit: 50,
    });
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

    const { result } = await listAuditEventsByTimestamp(auditKey, {
      limit: 50,
    });
    expect(result?.events?.length ?? 0).toBe(0);
  });

  it("logs only the error's name and code when appendAuditEvent throws, not the error", async () => {
    const logErrorSpy = vi.fn();
    const errorSpy = vi.fn();
    vi.spyOn(safNode, "getSafReporters").mockReturnValue({
      log: { error: errorSpy } as unknown as safNode.SafReporters["log"],
      logError: logErrorSpy,
    });
    const failure = Object.assign(
      new Error("insert failed: jane@example.com"),
      {
        code: "SQLITE_CONSTRAINT",
        params: ["jane@example.com"],
      },
    );
    vi.spyOn(auditDbModule, "appendAuditEvent").mockRejectedValueOnce(failure);

    await request(app).get("/boom/b1");
    await drainAuditRecorder();

    expect(errorSpy).toHaveBeenCalledTimes(1);
    const [message, fields] = errorSpy.mock.calls[0]!;
    expect(message).toBe("appendAuditEvent failed");
    expect(fields).toMatchObject({
      error_name: "Error",
      error_code: "SQLITE_CONSTRAINT",
    });
    expect(JSON.stringify(fields)).not.toContain("jane@example.com");
    expect(logErrorSpy).toHaveBeenCalledWith(failure);
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

    const { result } = await listAuditEventsByTimestamp(auditKey, {
      limit: 50,
    });
    expect(result?.events?.length ?? 0).toBe(0);
  });
});

describe("machineOnly entries", () => {
  it("record a machine credential's call but not a signed-in person's", async () => {
    process.env.DEPLOYMENT_NAME = "audit-http-test";
    const auditKey = auditDb.connect();
    const recorder = createAuditRecorder({
      getAuditDbKey: () => auditKey,
      auditMap: { "GET /polled": { eventType: "polled.read", resourceType: "x", machineOnly: true } },
      resolveMachineActor: (res) => (res.locals.token ? { authMethod: "ops_token", actorId: "ops_token:t1" } : undefined),
    });
    const app = express();
    app.use((req, res, next) => {
      const person = req.headers["x-person"] === "1";
      if (!person) res.locals.token = true;
      safContextStorage.run(
        { requestId: "r", serviceName: "test", subsystemName: "http", operationName: "op", auth: person ? { userId: "u1" } : undefined },
        () => next(),
      );
    });
    app.use(recorder.middleware());
    app.get("/polled", (_req, res) => {
      res.sendStatus(200);
    });
    await request(app).get("/polled").set("x-person", "1").expect(200);
    await request(app).get("/polled").expect(200);
    await drainAuditRecorder();
    const { result } = await listAuditEventsByTimestamp(auditKey, { limit: 10 });
    expect(result!.events.map((e) => [e.event_type, e.auth_method, e.actor_user_id])).toEqual([
      ["polled.read", "ops_token", "ops_token:t1"],
    ]);
    auditDb.disconnect(auditKey);
  });
});
