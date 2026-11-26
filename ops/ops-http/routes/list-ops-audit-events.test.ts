import { describe, expect, it } from "vitest";
import request from "supertest";
import createError from "http-errors";
import { createToken, opsDb } from "@saflib/ops-db";
import { throwError } from "@saflib/utils";
import { createApp } from "../http.ts";
import type { OpsAuditSource } from "../audit/source.ts";

const event = {
  id: "e1",
  ts: "2026-11-26T10:00:00.000Z",
  event_type: "kratos.login.password.success",
  outcome: "success",
  source: "kratos",
  actor_user_id: "u1",
  on_behalf_of_user_id: null,
  auth_method: "kratos_webhook",
  resource_type: "user",
  resource_id: "u1",
  request_id: null,
  client_ip: "203.0.113.9",
  untrusted: { details: { user_agent: "Firefox" } },
};

async function setup(audit?: OpsAuditSource) {
  const dbKey = opsDb.connect();
  const app = createApp({ dbKey, audit });
  const { token } = await throwError(createToken(dbKey, { name: "t", scopes: ["ops:read"], createdBy: null }));
  return { app, auth: `Bearer ${token}` };
}

describe("GET /ops/audit", () => {
  it("passes filters to the product's audit log and returns a page", async () => {
    const calls: unknown[] = [];
    const { app, auth } = await setup({
      list: async (params) => {
        calls.push(params);
        return { events: [event], nextCursor: "c2" };
      },
    });
    const res = await request(app)
      .get("/ops/audit?event_prefix=kratos.&user_id=u1&since=2026-11-25T00:00:00Z&limit=150")
      .set("authorization", auth)
      .expect(200);
    expect(res.body).toEqual({ events: [event], next_cursor: "c2" });
    expect(calls).toEqual([
      { userId: "u1", eventPrefix: "kratos.", since: new Date("2026-11-25T00:00:00Z"), limit: 150, cursor: undefined },
    ]);
  });

  it("404s without an audit log and passes a bad cursor through as 400", async () => {
    const none = await setup();
    await request(none.app).get("/ops/audit").set("authorization", none.auth).expect(404);
    const bad = await setup({
      list: async () => {
        throw createError(400, "Invalid cursor");
      },
    });
    await request(bad.app).get("/ops/audit?cursor=zzz").set("authorization", bad.auth).expect(400);
  });

  it("needs a token", async () => {
    const { app } = await setup({ list: async () => ({ events: [], nextCursor: null }) });
    await request(app).get("/ops/audit").expect(401);
  });
});
