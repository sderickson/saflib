import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { auditDb } from "@saflib/audit-db/instances";
import { appendAuditEvent } from "@saflib/audit-db/queries/audit-event/append";
import type { DbKey } from "@saflib/drizzle";
import { opsAuditSource } from "./ops-audit-source.ts";

describe("opsAuditSource", () => {
  let dbKey: DbKey;
  let prevDeploymentName: string | undefined;
  beforeEach(() => {
    // appendAuditEvent stores DEPLOYMENT_NAME in the non-null `env` column.
    prevDeploymentName = process.env.DEPLOYMENT_NAME;
    process.env.DEPLOYMENT_NAME = "ops-audit-test";
    dbKey = auditDb.connect();
  });
  afterEach(() => {
    auditDb.disconnect(dbKey);
    if (prevDeploymentName === undefined) delete process.env.DEPLOYMENT_NAME;
    else process.env.DEPLOYMENT_NAME = prevDeploymentName;
  });

  it("lists newest first, filtered, with details marked untrusted", async () => {
    const add = (ts: string, event_type: string) =>
      appendAuditEvent(dbKey, {
        ts: new Date(ts),
        source: "kratos",
        event_type,
        outcome: "success",
        actor_user_id: "u1",
        client_ip: "203.0.113.9",
        details: { source: "kratos", user_agent: "Firefox" },
      });
    await add("2026-11-25T00:00:00Z", "kratos.login.password.success");
    await add("2026-11-26T00:00:00Z", "kratos.settings.totp.success");
    await add("2026-11-26T01:00:00Z", "http.GET /x");

    const source = opsAuditSource({ getAuditDbKey: () => dbKey });
    const { events, nextCursor } = await source.list({ eventPrefix: "kratos.", limit: 1 });
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      event_type: "kratos.settings.totp.success",
      ts: "2026-11-26T00:00:00.000Z",
      client_ip: "203.0.113.9",
      untrusted: { details: { user_agent: "Firefox" } },
    });
    expect(events[0]).not.toHaveProperty("row_hash");
    const next = await source.list({ eventPrefix: "kratos.", limit: 5, cursor: nextCursor! });
    expect(next.events.map((e) => e.event_type)).toEqual(["kratos.login.password.success"]);
    await expect(source.list({ limit: 5, cursor: "%%%" })).rejects.toMatchObject({ status: 400 });
  });
});
