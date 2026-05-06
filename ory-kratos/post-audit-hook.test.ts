import { describe, it, expect, vi, afterEach } from "vitest";
import request from "supertest";
import express from "express";
import {
  createErrorMiddleware,
  createInternalMiddleware,
} from "@saflib/express";
import { makePostAuditHookHandler } from "./post-audit-hook.ts";

describe("makePostAuditHookHandler", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 204 and invokes callback once with normalized fields", async () => {
    const onAuditEvent = vi.fn().mockResolvedValue(undefined);
    const app = express();
    app.use(createInternalMiddleware());
    app.post("/audit/kratos-hook", makePostAuditHookHandler({ onAuditEvent }));
    app.use(createErrorMiddleware());

    const res = await request(app)
      .post("/audit/kratos-hook")
      .send({
        stage: "login.after.password",
        flow_id: "flow-1",
        identity_id: "id-1",
        success: true,
        methods: ["password"],
        error_reason: undefined,
      })
      .set("Content-Type", "application/json")
      .set("User-Agent", "test-ua/1")
      .set("Accept-Language", "en-US");

    expect(res.status).toBe(204);
    expect(onAuditEvent).toHaveBeenCalledTimes(1);
    expect(onAuditEvent).toHaveBeenCalledWith({
      stage: "login.after.password",
      flow_id: "flow-1",
      identity_id: "id-1",
      success: true,
      methods: ["password"],
      error_reason: undefined,
      user_agent: "test-ua/1",
      accept_language: "en-US",
    });
  });

  it("returns 400 when stage is missing", async () => {
    const onAuditEvent = vi.fn();
    const app = express();
    app.use(createInternalMiddleware());
    app.post("/audit/kratos-hook", makePostAuditHookHandler({ onAuditEvent }));
    app.use(createErrorMiddleware());

    const res = await request(app)
      .post("/audit/kratos-hook")
      .send({ identity_id: "id-1", success: true })
      .set("Content-Type", "application/json");

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "missing stage or identity_id" });
    expect(onAuditEvent).not.toHaveBeenCalled();
  });

  it("returns 400 when identity_id is missing", async () => {
    const onAuditEvent = vi.fn();
    const app = express();
    app.use(createInternalMiddleware());
    app.post("/audit/kratos-hook", makePostAuditHookHandler({ onAuditEvent }));
    app.use(createErrorMiddleware());

    const res = await request(app)
      .post("/audit/kratos-hook")
      .send({ stage: "login.after.password", success: true })
      .set("Content-Type", "application/json");

    expect(res.status).toBe(400);
    expect(onAuditEvent).not.toHaveBeenCalled();
  });

  it("forwards to error middleware when callback throws", async () => {
    const boom = new Error("boom");
    const onAuditEvent = vi.fn().mockRejectedValue(boom);

    const app = express();
    app.use(createInternalMiddleware());
    app.post("/audit/kratos-hook", makePostAuditHookHandler({ onAuditEvent }));
    app.use(createErrorMiddleware());

    const res = await request(app)
      .post("/audit/kratos-hook")
      .send({
        stage: "login.after.password",
        identity_id: "id-1",
        success: false,
      })
      .set("Content-Type", "application/json");

    expect(res.status).toBe(500);
    expect(res.body.message).toBe("boom");
    expect(res.body.status).toBe(500);
  });
});
