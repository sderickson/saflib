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
    const old = recordOccurrence(issuesKey, { level: "error", kind: "server", serviceName: "s", message: "old", fingerprint: "old", ts: new Date(Date.now() - 3 * DAY) });
    await throwError(setIssueStatus(issuesKey, old.group.id, { status: "resolved", actor: "a" }));
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

  it("leaves out issues new or regressed in the window but since resolved", async () => {
    const fixed = recordOccurrence(issuesKey, { level: "error", kind: "server", serviceName: "s", message: "fixed", fingerprint: "fixed" }).group.id;
    await throwError(setIssueStatus(issuesKey, fixed, { status: "resolved", actor: "a" }));
    const back = recordOccurrence(issuesKey, { level: "error", kind: "server", serviceName: "s", message: "back", fingerprint: "back", ts: new Date(Date.now() - 3 * DAY) }).group.id;
    await throwError(setIssueStatus(issuesKey, back, { status: "resolved", actor: "a" }));
    recordOccurrence(issuesKey, { level: "error", kind: "server", serviceName: "s", message: "back", fingerprint: "back" });
    await throwError(setIssueStatus(issuesKey, back, { status: "resolved", actor: "a" }));
    const res = await request(app()).get("/ops/digest").set(auth).expect(200);
    const { summary, issues } = res.body.digest;
    expect(summary).toMatchObject({ needs_attention: false, new_issues: 0, regressed_issues: 0 });
    expect(issues.new).toEqual([]);
    expect(issues.regressed).toEqual([]);
  });

  it("lists open issues however long ago they were last seen", async () => {
    // Quiet for days, still open: absent from the window's lists, present in open.
    const old = recordOccurrence(issuesKey, { level: "warn", kind: "server", serviceName: "s", message: "old leak", fingerprint: "old", ts: new Date(Date.now() - 5 * DAY) }).group.id;
    const fresh = recordOccurrence(issuesKey, { level: "error", kind: "server", serviceName: "s", message: "fresh", fingerprint: "fresh" }).group.id;
    const res = await request(app()).get("/ops/digest").set(auth).expect(200);
    const { summary, issues } = res.body.digest;
    const ids = (list: Array<{ id: string }>) => list.map((i) => i.id).sort();
    expect(summary.open_issues).toBe(2);
    // Open issues count toward attention, matching the Issues page.
    expect(summary.attention).toContainEqual(expect.objectContaining({ kind: "issues", tone: "bad" }));
    expect(ids(issues.top)).toEqual([fresh]);
    expect(ids(issues.open)).toEqual([fresh, old].sort());
  });

  it("returns null sections for stores the product hasn't enabled", async () => {
    const plain = createApp({ dbKey: opsKey });
    const res = await request(plain).get("/ops/digest").set(auth).expect(200);
    expect(res.body.digest.issues).toBeNull();
    expect(res.body.digest.logs).toBeNull();
    expect(res.body.digest.summary.needs_attention).toBe(false);
  });
});

describe("GET /ops/digest tiles", () => {
  it("includes product tiles; a bad one needs attention, a failing provider says so", async () => {
    const opsKey = opsDb.connect();
    const { token } = await throwError(createToken(opsKey, { name: "t", scopes: ["ops:read"], createdBy: null }));
    const appWithTiles = createApp({
      dbKey: opsKey,
      digestTiles: [
        {
          key: "jobs",
          label: "Background jobs",
          tiles: async () => ({ key: "jobs", group: "system", label: "Background jobs", value: "3 failed", detail: "Last 24h", tone: "bad" }),
        },
        {
          key: "drafts",
          label: "Drafts",
          group: "customers",
          tiles: async () => ({ key: "drafts", group: "customers", label: "Drafts", value: "2 to review", detail: "", tone: "todo" }),
        },
        {
          key: "inbox",
          label: "Inbox",
          group: "customers",
          tiles: async () => {
            throw new Error("db locked");
          },
        },
      ],
    });
    const res = await request(appWithTiles).get("/ops/digest").set({ authorization: `Bearer ${token}` }).expect(200);
    const { tiles, summary, process: proc } = res.body.digest;
    expect(tiles).toContainEqual(expect.objectContaining({ key: "jobs", tone: "bad" }));
    expect(tiles).toContainEqual(
      expect.objectContaining({ key: "inbox", group: "customers", value: "Couldn't check", detail: "db locked", tone: "warn" }),
    );
    expect(tiles.map((t: { key: string }) => t.key)).toEqual(expect.arrayContaining(["health", "alerts"]));
    // Every tile has a tone; deploys live in Diagnostics → Build.
    expect(tiles.map((t: { key: string }) => t.key)).not.toContain("deploys");
    expect(tiles.every((t: { tone: string }) => ["ok", "todo", "warn", "bad"].includes(t.tone))).toBe(true);
    expect(summary.needs_attention).toBe(true);
    expect(summary.attention).toContainEqual({ kind: "tile", key: "jobs", summary: "Background jobs: 3 failed", tone: "bad" });
    // Work waiting is not a problem.
    expect(summary.attention.map((a: { key: string }) => a.key)).not.toContain("drafts");
    expect(proc.requests_total).toBeGreaterThanOrEqual(0);
    expect(proc.rss_bytes).toBeGreaterThan(0);
  });
});
