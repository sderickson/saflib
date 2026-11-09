import { describe, expect, it } from "vitest";
import request from "supertest";
import { createToken, opsDb, upsertAlerts, type OpsTokenScope } from "@saflib/ops-db";
import { throwError } from "@saflib/utils";
import { createApp } from "../http.ts";

async function setup() {
  const dbKey = opsDb.connect();
  const app = createApp({ dbKey });
  const token = async (scopes: OpsTokenScope[]) => {
    const { token } = await throwError(createToken(dbKey, { name: "t", scopes, createdBy: null }));
    return { authorization: `Bearer ${token}` };
  };
  return { dbKey, app, ingest: await token(["ops:alerts-ingest"]), reader: await token(["ops:read"]), triager: await token(["ops:read", "ops:triage"]) };
}

const payload = (status: "firing" | "resolved", endsAt = "0001-01-01T00:00:00Z") => ({
  version: "4",
  status,
  receiver: "hub-ops",
  groupKey: "{}:{alertname=\"SafHighErrorRate\"}",
  alerts: [
    {
      status,
      labels: { alertname: "SafHighErrorRate", severity: "warning", saf_app: "hub" },
      annotations: { summary: "5xx above 5% <script>" },
      startsAt: "2026-11-09T01:00:00Z",
      endsAt,
      generatorURL: "http://prometheus:9090/graph",
      fingerprint: "f00d",
    },
  ],
});

describe("/ops/alerts", () => {
  it("records Alertmanager alerts, lists them, and acks them", async () => {
    const { app, ingest, reader, triager } = await setup();
    const posted = await request(app).post("/ops/alerts/webhook").set(ingest).send(payload("firing"));
    expect(posted.status).toBe(200);

    const listed = await request(app).get("/ops/alerts").set(reader).expect(200);
    expect(listed.body.alerts).toHaveLength(1);
    const alert = listed.body.alerts[0];
    expect(alert).toMatchObject({
      alertname: "SafHighErrorRate",
      severity: "warning",
      status: "firing",
      labels: { saf_app: "hub" },
      untrusted: { annotations: { summary: "5xx above 5% <script>" } },
      acked_at: null,
    });

    const digest = await request(app).get("/ops/digest").set(reader).expect(200);
    expect(digest.body.digest.summary).toMatchObject({ needs_attention: true, firing_alerts: 1 });
    expect(digest.body.digest.alerts).toMatchObject({ firing_unacked: 1, fired_in_window: 1 });

    const acked = await request(app).post(`/ops/alerts/${alert.id}/ack`).set(triager).send({}).expect(200);
    expect(acked.body.alert.acked_by).toMatch(/^ops_token:/);
    const after = await request(app).get("/ops/digest").set(reader).expect(200);
    expect(after.body.digest.summary.firing_alerts).toBe(0);

    await request(app)
      .post("/ops/alerts/webhook")
      .set(ingest)
      .send(payload("resolved", "2026-11-09T02:00:00Z"))
      .expect(200);
    expect((await request(app).get("/ops/alerts").set(reader).expect(200)).body.alerts).toHaveLength(0);
    const all = await request(app).get("/ops/alerts?status=all").set(reader).expect(200);
    expect(all.body.alerts[0]).toMatchObject({ status: "resolved", ends_at: "2026-11-09T02:00:00.000Z" });
  });

  it("keeps scopes apart: ingest can only post, readers can't post or ack", async () => {
    const { app, ingest, reader } = await setup();
    await request(app).get("/ops/alerts").set(ingest).expect(403);
    await request(app).get("/ops/health").set(ingest).expect(403);
    await request(app).post("/ops/alerts/webhook").set(reader).send(payload("firing")).expect(403);
    await request(app).post("/ops/alerts/x/ack").set(reader).send({}).expect(403);
    await request(app).post("/ops/alerts/webhook").send(payload("firing")).expect(401);
  });

  it("404s acking an unknown alert", async () => {
    const { app, triager } = await setup();
    await request(app).post("/ops/alerts/nope/ack").set(triager).send({}).expect(404);
  });

  it("treats the Watchdog as the pipeline heartbeat, not an alert", async () => {
    const { dbKey, app, ingest, reader } = await setup();
    const watchdog = (startsAt: string) => ({
      fingerprint: "watchdog",
      status: "firing" as const,
      labels: { alertname: "Watchdog", severity: "none", saf_app: "host" },
      annotations: { summary: "Alerting pipeline heartbeat" },
      startsAt,
    });

    let digest = (await request(app).get("/ops/digest").set(reader).expect(200)).body.digest;
    expect(digest.alerts).toMatchObject({ pipeline_last_seen_at: null, pipeline_stale: false });

    await request(app)
      .post("/ops/alerts/webhook")
      .set(ingest)
      .send({ alerts: [{ ...watchdog("2026-11-09T00:00:00Z"), endsAt: "0001-01-01T00:00:00Z" }] })
      .expect(200);
    expect((await request(app).get("/ops/alerts").set(reader).expect(200)).body.alerts).toHaveLength(0);
    digest = (await request(app).get("/ops/digest").set(reader).expect(200)).body.digest;
    expect(digest.summary).toMatchObject({ needs_attention: false, firing_alerts: 0 });
    expect(digest.alerts.firing).toHaveLength(0);
    expect(digest.alerts.pipeline_stale).toBe(false);
    expect(Date.now() - new Date(digest.alerts.pipeline_last_seen_at).getTime()).toBeLessThan(60_000);

    // Last delivery 20 minutes ago: alerting is broken.
    await throwError(upsertAlerts(dbKey, [watchdog("2026-11-09T00:00:00Z")], new Date(Date.now() - 20 * 60_000)));
    digest = (await request(app).get("/ops/digest").set(reader).expect(200)).body.digest;
    expect(digest.alerts.pipeline_stale).toBe(true);
    expect(digest.summary.needs_attention).toBe(true);
  });
});
