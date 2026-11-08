import { afterEach, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import winston from "winston";
import type { DbKey } from "@saflib/drizzle";
import { createToken, opsDb } from "@saflib/ops-db";
import { issuesDb, recordOccurrence, setIssueStatus } from "@saflib/errors-db";
import { createPersistentLogTransport, logsDb, type PersistentLogTransport } from "@saflib/node-log-db";
import { throwError } from "@saflib/utils";
import { createApp } from "../http.ts";
import type { HealthCheck } from "../health/types.ts";

const DAY = 86_400_000;

describe("GET /ops/digest", () => {
  let opsKey: DbKey;
  let issuesKey: DbKey;
  let logsKey: DbKey;
  let transport: PersistentLogTransport;
  let auth: { authorization: string };

  beforeEach(async () => {
    opsKey = opsDb.connect();
    issuesKey = issuesDb.connect();
    logsKey = logsDb.connect();
    transport = createPersistentLogTransport({ getDbKey: () => logsKey, flushIntervalMs: 60_000 });
    const { token } = await throwError(createToken(opsKey, { name: "d", scopes: ["ops:read"], createdBy: null }));
    auth = { authorization: `Bearer ${token}` };
  });
  afterEach(() => transport.close());

  const app = (healthChecks: HealthCheck[] = []) =>
    createApp({ dbKey: opsKey, issuesDbKey: issuesKey, logsDbKey: logsKey, healthChecks, buildInfo: { buildRef: "b1" } });

  it("says nothing needs attention on a quiet day", async () => {
    // Old history only: an issue and info logs from before the window.
    recordOccurrence(issuesKey, { level: "error", kind: "server", serviceName: "s", message: "old", fingerprint: "old", ts: new Date(Date.now() - 3 * DAY) });
    winston.createLogger({ transports: [transport] }).info("routine heartbeat 1");
    transport.flush();
    const since = encodeURIComponent(new Date(Date.now() - 1000).toISOString());
    const res = await request(app()).get(`/ops/digest?since=${since}`).set(auth).expect(200);
    // The info heartbeat is a new template but not a warn/error one.
    expect(res.body.digest.summary).toMatchObject({
      needs_attention: false,
      new_issues: 0,
      regressed_issues: 0,
      new_log_templates: 1,
    });
    expect(res.body.digest.health.failing).toEqual([]);
  });

  it("surfaces new, regressed and top issues, new severe templates, failing checks and deploys", async () => {
    const back = recordOccurrence(issuesKey, { level: "error", kind: "server", serviceName: "s", message: "back", fingerprint: "back", ts: new Date(Date.now() - 3 * DAY) });
    await throwError(setIssueStatus(issuesKey, back.group.id, { status: "resolved", actor: "a" }));
    recordOccurrence(issuesKey, { level: "error", kind: "server", serviceName: "s", message: "back", fingerprint: "back" });
    for (let i = 0; i < 4; i++) recordOccurrence(issuesKey, { level: "error", kind: "server", serviceName: "s", message: "new crash", fingerprint: "crash" });
    const noisy = recordOccurrence(issuesKey, { level: "warn", kind: "server", serviceName: "s", message: "noisy", fingerprint: "noisy" });
    await throwError(setIssueStatus(issuesKey, noisy.group.id, { status: "ignored", actor: "a" }));
    const log = winston.createLogger({ transports: [transport] });
    log.warn("cache backend unreachable, using fallback");
    log.error("payment webhook signature mismatch");
    transport.flush();
    const disk: HealthCheck = { name: "disk", run: async () => ({ status: "warn", summary: "15% free" }) };

    const res = await request(app([disk])).get("/ops/digest").set(auth).expect(200);
    const d = res.body.digest;
    expect(d.summary).toMatchObject({
      needs_attention: true,
      health_status: "warn",
      new_issues: 1,
      regressed_issues: 1,
      open_issues: 2,
      new_log_templates: 2,
      deploys: 1,
    });
    expect(d.health.failing.map((c: { name: string }) => c.name)).toEqual(["disk"]);
    expect(d.issues.new.map((i: { untrusted: { title: string } }) => i.untrusted.title)).toEqual(["new crash"]);
    expect(d.issues.regressed.map((i: { untrusted: { title: string } }) => i.untrusted.title)).toEqual(["back"]);
    expect(d.issues.top.map((i: { untrusted: { title: string }; window_count: number }) => [i.untrusted.title, i.window_count])).toEqual([
      ["new crash", 4],
      ["back", 1],
    ]);
    expect(d.logs.level_counts).toEqual({ warn: 1, error: 1 });
    expect(d.deploys.map((b: { build_ref: string }) => b.build_ref)).toEqual(["b1"]);
  });

  it("returns null sections for stores the product hasn't enabled", async () => {
    const plain = createApp({ dbKey: opsKey });
    const res = await request(plain).get("/ops/digest").set(auth).expect(200);
    expect(res.body.digest.issues).toBeNull();
    expect(res.body.digest.logs).toBeNull();
    expect(res.body.digest.summary.needs_attention).toBe(false);
  });
});
