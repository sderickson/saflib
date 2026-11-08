import { beforeEach, describe, expect, it } from "vitest";
import type { DbKey } from "@saflib/drizzle";
import { throwError } from "@saflib/utils";
import {
  createIssueCollector,
  getIssue,
  IssueNotFoundError,
  issuesDb,
  listIssues,
  listOccurrences,
  OCCURRENCES_PER_ISSUE,
  pruneIssues,
  recordOccurrence,
  setIssueStatus,
} from "./index.ts";
import { issuesDbManager } from "./instances.ts";

const HOUR = 3_600_000;
const base = { level: "error" as const, kind: "server", serviceName: "svc" };

describe("issues", () => {
  let dbKey: DbKey;
  beforeEach(() => {
    dbKey = issuesDb.connect();
  });

  it("groups occurrences, counts them, and redacts what it stores", async () => {
    const first = recordOccurrence(dbKey, {
      ...base,
      message: "save failed for alice@example.com",
      fingerprint: "save",
      requestId: "r1",
      fields: { recipeId: "rc_1", password: "hunter2" },
      version: "v1",
    });
    const second = recordOccurrence(dbKey, { ...base, message: "save failed again", fingerprint: "save", version: "v2" });
    expect(first.isNew).toBe(true);
    expect(second.isNew).toBe(false);
    expect(second.group).toMatchObject({
      id: first.group.id,
      count: 2,
      status: "open",
      title: "save failed for [redacted:email]",
      first_seen_version: "v1",
      last_seen_version: "v2",
    });
    const occ = await throwError(listOccurrences(dbKey, first.group.id));
    expect(occ.map((o) => o.message)).toEqual(["save failed again", "save failed for [redacted:email]"]);
    expect(occ[1]!.fields).toEqual({ recipeId: "rc_1", password: "[redacted:secret_field]" });
    expect(occ[1]!.request_id).toBe("r1");
  });

  it("regresses resolved issues and escalates level", async () => {
    const { group } = recordOccurrence(dbKey, { ...base, level: "warn", message: "flaky", fingerprint: "f" });
    await throwError(setIssueStatus(dbKey, group.id, { status: "resolved", actor: "ops_token:t1", note: "fixed in #12" }));
    const again = recordOccurrence(dbKey, { ...base, level: "error", message: "flaky", fingerprint: "f" });
    expect(again.regressed).toBe(true);
    expect(again.group).toMatchObject({ status: "regressed", status_changed_by: "system", level: "error" });
  });

  it("keeps ignored issues ignored until the ignore expires", async () => {
    const t0 = new Date("2026-11-08T00:00:00Z");
    const forever = recordOccurrence(dbKey, { ...base, message: "noise", fingerprint: "n", ts: t0 });
    await throwError(setIssueStatus(dbKey, forever.group.id, { status: "ignored", actor: "a" }));
    expect(recordOccurrence(dbKey, { ...base, message: "noise", fingerprint: "n" }).group.status).toBe("ignored");

    const timed = recordOccurrence(dbKey, { ...base, message: "maint", fingerprint: "m", ts: t0 });
    await throwError(
      setIssueStatus(dbKey, timed.group.id, { status: "ignored", actor: "a", until: new Date(t0.getTime() + HOUR) }),
    );
    const during = recordOccurrence(dbKey, { ...base, message: "maint", fingerprint: "m", ts: new Date(t0.getTime() + 1000) });
    expect(during.group.status).toBe("ignored");
    const after = recordOccurrence(dbKey, { ...base, message: "maint", fingerprint: "m", ts: new Date(t0.getTime() + 2 * HOUR) });
    expect(after.group).toMatchObject({ status: "open", status_changed_by: "system" });
  });

  it("keeps only the newest occurrences per issue", async () => {
    let id = "";
    for (let i = 0; i < OCCURRENCES_PER_ISSUE + 5; i++) {
      id = recordOccurrence(dbKey, { ...base, message: `burst ${i}`, fingerprint: "burst" }).group.id;
    }
    const occ = await throwError(listOccurrences(dbKey, id, 100));
    expect(occ).toHaveLength(OCCURRENCES_PER_ISSUE);
    expect(occ[0]!.message).toBe(`burst ${OCCURRENCES_PER_ISSUE + 4}`);
    expect((await throwError(getIssue(dbKey, id))).count).toBe(OCCURRENCES_PER_ISSUE + 5);
  });

  it("lists by window: new, regressed, busiest", async () => {
    const now = Date.now();
    const old = new Date(now - 3 * 24 * HOUR);
    recordOccurrence(dbKey, { ...base, message: "old", fingerprint: "old", ts: old });
    const oldResolved = recordOccurrence(dbKey, { ...base, message: "back", fingerprint: "back", ts: old });
    await throwError(setIssueStatus(dbKey, oldResolved.group.id, { status: "resolved", actor: "a" }));
    recordOccurrence(dbKey, { ...base, message: "back", fingerprint: "back" });
    for (let i = 0; i < 3; i++) recordOccurrence(dbKey, { ...base, message: "hot", fingerprint: "hot" });
    recordOccurrence(dbKey, { ...base, level: "warn", message: "mild", fingerprint: "mild" });

    const windowSince = new Date(now - 24 * HOUR);
    const fresh = await throwError(listIssues(dbKey, { windowSince, newInWindow: true, sort: "window_count" }));
    expect(fresh.issues.map((i) => [i.title, i.window_count])).toEqual([
      ["hot", 3],
      ["mild", 1],
    ]);
    const regressed = await throwError(listIssues(dbKey, { windowSince, regressedInWindow: true }));
    expect(regressed.issues.map((i) => i.title)).toEqual(["back"]);
    const errorsOnly = await throwError(listIssues(dbKey, { levels: ["warn"] }));
    expect(errorsOnly.issues.map((i) => i.title)).toEqual(["mild"]);
    const open = await throwError(listIssues(dbKey, { statuses: ["open"], limit: 2, sort: "count" }));
    expect(open.issues).toHaveLength(2);
    const page2 = await throwError(listIssues(dbKey, { statuses: ["open"], limit: 2, sort: "count", cursor: open.nextCursor! }));
    expect(page2.issues).toHaveLength(1);
  });

  it("reports unknown ids", async () => {
    expect((await getIssue(dbKey, "nope")).error).toBeInstanceOf(IssueNotFoundError);
    expect((await listOccurrences(dbKey, "nope")).error).toBeInstanceOf(IssueNotFoundError);
    expect((await setIssueStatus(dbKey, "nope", { status: "open", actor: "a" })).error).toBeInstanceOf(IssueNotFoundError);
  });

  it("collects warning/error/fatal reports, not info", async () => {
    const collect = createIssueCollector({ getDbKey: () => dbKey, ignore: (m) => m.startsWith("ignored") });
    const tags = { "service.name": "svc", "operation.name": "op", "request.id": "r9" };
    collect({ error: new Error("disk nearly full"), level: "warning", extra: {}, tags, fingerprint: "disk" });
    collect({ error: new Error("fyi"), level: "info", extra: {}, tags });
    collect({ error: new Error("ignored echo"), level: "error", extra: {}, tags });
    collect({ error: new TypeError("x is undefined"), level: "error", extra: { recipeId: "r1" }, tags });
    const { issues } = await throwError(listIssues(dbKey, { sort: "first_seen" }));
    expect(issues.map((i) => [i.title, i.level, i.operation_name])).toEqual([
      ["x is undefined", "error", "op"],
      ["disk nearly full", "warn", "op"],
    ]);
  });

  it("prunes old counts and stale closed issues, keeps open ones", async () => {
    const old = new Date(Date.now() - 120 * 24 * HOUR);
    const closed = recordOccurrence(dbKey, { ...base, message: "gone", fingerprint: "gone", ts: old });
    await throwError(setIssueStatus(dbKey, closed.group.id, { status: "resolved", actor: "a" }));
    const open = recordOccurrence(dbKey, { ...base, message: "still", fingerprint: "still", ts: old });
    const result = pruneIssues(dbKey);
    expect(result.groups).toBe(1);
    expect((await getIssue(dbKey, closed.group.id)).error).toBeInstanceOf(IssueNotFoundError);
    expect((await throwError(getIssue(dbKey, open.group.id))).title).toBe("still");
    const c = issuesDbManager.get(dbKey)!.$client;
    expect((c.prepare("select count(*) n from issue_hourly_counts").get() as { n: number }).n).toBe(0);
  });
});
