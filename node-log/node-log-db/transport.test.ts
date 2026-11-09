import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import winston from "winston";
import client from "prom-client";
import type { DbKey } from "@saflib/drizzle";
import { throwError } from "@saflib/utils";
import {
  createPersistentLogTransport,
  listLogs,
  listTemplates,
  logsDb,
  pruneLogs,
  toFtsQuery,
  type PersistentLogTransport,
  type RedactionEvent,
} from "./index.ts";
import { logsDbManager } from "./instances.ts";

describe("persistent log transport", () => {
  let dbKey: DbKey;
  let transport: PersistentLogTransport;
  let logger: winston.Logger;
  let redactions: RedactionEvent[];

  function child(requestId: string) {
    return logger.child({
      service_name: "svc",
      subsystem_name: "svc.http",
      operation_name: "getThing",
      request_id: requestId,
      user_id: "u_1",
    });
  }

  beforeEach(() => {
    dbKey = logsDb.connect();
    redactions = [];
    transport = createPersistentLogTransport({
      getDbKey: () => dbKey,
      flushIntervalMs: 60_000,
      onRedaction: (e) => redactions.push(e),
    });
    logger = winston.createLogger({ level: "debug", transports: [transport] });
  });
  afterEach(() => {
    transport.close();
  });

  it("persists redacted lines with context and fields, newest first", async () => {
    child("r1").info("thing loaded", { thingId: "t_9", userEmail: "a@b.co" });
    child("r2").warn("slow call to carol@example.com took 900ms");
    child("r2").debug("not persisted below info");
    transport.flush();

    const { entries, nextCursor } = await throwError(listLogs(dbKey, {}));
    expect(nextCursor).toBeNull();
    expect(entries.map((e) => e.message)).toEqual([
      "slow call to [redacted:email] took 900ms",
      "thing loaded",
    ]);
    expect(entries[1]).toMatchObject({
      level: "info",
      service_name: "svc",
      operation_name: "getThing",
      request_id: "r1",
      user_id: "u_1",
      fields: { thingId: "t_9", userEmail: "[redacted:pii_field]" },
      redactions: 1,
    });
    expect(redactions.map((r) => r.detections.map((d) => d.kind))).toEqual([["pii_field"], ["email"]]);
    expect(redactions[1]!.template).toBe("slow call to <redacted> took <n>ms");
  });

  it("filters by level, request, template and text; pages by cursor", async () => {
    for (let i = 0; i < 5; i++) child(`r${i}`).info(`processed batch ${i} of recipes`);
    child("rx").error("database locked while saving");
    transport.flush();

    const errors = await throwError(listLogs(dbKey, { minLevel: "warn" }));
    expect(errors.entries.map((e) => e.message)).toEqual(["database locked while saving"]);

    const byRequest = await throwError(listLogs(dbKey, { requestId: "r3" }));
    expect(byRequest.entries.map((e) => e.message)).toEqual(["processed batch 3 of recipes"]);

    const text = await throwError(listLogs(dbKey, { q: "locked database" }));
    expect(text.entries).toHaveLength(1);
    // FTS syntax in user input is treated literally, not parsed (or crashing).
    const hostile = await throwError(listLogs(dbKey, { q: 'recipes" OR "x* NEAR(' }));
    expect(hostile.entries).toEqual([]);

    const first = await throwError(listLogs(dbKey, { q: "recipes", limit: 2 }));
    expect(first.entries).toHaveLength(2);
    const second = await throwError(listLogs(dbKey, { q: "recipes", limit: 2, cursor: first.nextCursor! }));
    const third = await throwError(listLogs(dbKey, { q: "recipes", limit: 2, cursor: second.nextCursor! }));
    expect([...first.entries, ...second.entries, ...third.entries].map((e) => e.request_id)).toEqual([
      "r4",
      "r3",
      "r2",
      "r1",
      "r0",
    ]);
    expect(third.nextCursor).toBeNull();

    const hash = first.entries[0]!.template_hash;
    const sameShape = await throwError(listLogs(dbKey, { templateHash: hash }));
    expect(sameShape.entries).toHaveLength(5);
  });

  it("counts lines by level in a window", async () => {
    child("a").info("one");
    child("a").warn("two");
    child("a").warn("three");
    transport.flush();
    const { countLogsByLevel } = await import("./index.ts");
    expect(await throwError(countLogsByLevel(dbKey, new Date(Date.now() - 60_000)))).toEqual({ info: 1, warn: 2 });
  });

  it("tracks templates with window counts and flags new ones", async () => {
    const before = new Date(Date.now() - 1000);
    child("a").info("job 1 done");
    child("b").info("job 2 done");
    child("c").warn("cache miss for key 7");
    transport.flush();

    const templates = await throwError(listTemplates(dbKey, { since: before, onlyNew: true }));
    expect(templates.map((t) => [t.template, t.window_count, t.count])).toEqual([
      ["job <n> done", 2, 2],
      ["cache miss for key <n>", 1, 1],
    ]);
    expect(templates[0]!.sample_message).toBe("job 2 done");

    const later = new Date(Date.now() + 1000);
    expect(await throwError(listTemplates(dbKey, { since: later }))).toEqual([]);
  });

  it("drops new lines when the queue is full, and counts them", async () => {
    transport.close();
    transport = createPersistentLogTransport({ getDbKey: () => dbKey, flushIntervalMs: 60_000, maxQueue: 2 });
    logger = winston.createLogger({ transports: [transport] });
    const before = (await client.register.getSingleMetric("saf_logs_dropped_total")!.get()).values
      .filter((v) => v.labels.reason === "queue_full")
      .reduce((n, v) => n + v.value, 0);
    for (let i = 0; i < 5; i++) child("q").info(`line ${i}`);
    transport.flush();
    const { entries } = await throwError(listLogs(dbKey, {}));
    expect(entries.map((e) => e.message)).toEqual(["line 1", "line 0"]);
    const after = (await client.register.getSingleMetric("saf_logs_dropped_total")!.get()).values
      .filter((v) => v.labels.reason === "queue_full")
      .reduce((n, v) => n + v.value, 0);
    expect(after - before).toBe(3);
  });

  it("never throws into the caller when the write fails", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    child("x").info("will fail to write");
    logsDb.disconnect(dbKey);
    expect(() => transport.flush()).not.toThrow();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
    dbKey = logsDb.connect();
  });
});

describe("pruneLogs", () => {
  it("removes lines past the age limit, and oldest lines past the size cap", async () => {
    const dbKey = logsDb.connect();
    const c = logsDbManager.get(dbKey)!.$client;
    const insert = c.prepare(
      `INSERT INTO log_entries (ts, level, level_num, template_hash, message) VALUES (?, 'info', 2, 'h', ?)`,
    );
    const old = Date.now() - 20 * 86_400_000;
    for (let i = 0; i < 3; i++) insert.run(old, `old ${i}`);
    for (let i = 0; i < 2000; i++) insert.run(Date.now(), `new ${i} ${"x".repeat(200)}`);

    const byAge = pruneLogs(dbKey, { maxAgeDays: 14, maxBytes: 1e12 });
    expect(byAge.byAge).toBe(3);
    expect(byAge.bySize).toBe(0);

    const cap = Math.floor(byAge.usedBytes / 2);
    const bySize = pruneLogs(dbKey, { maxAgeDays: 14, maxBytes: cap });
    expect(bySize.bySize).toBeGreaterThan(0);
    expect(bySize.usedBytes).toBeLessThanOrEqual(cap);
    // Oldest go first; the index stays in sync with the table.
    const { entries } = await throwError(listLogs(dbKey, { q: "new", limit: 500 }));
    expect(entries.length).toBeGreaterThan(0);
    const remaining = c.prepare(`SELECT COUNT(*) AS n FROM log_entries`).get() as { n: number };
    const indexed = c.prepare(`SELECT COUNT(*) AS n FROM log_entries_fts WHERE log_entries_fts MATCH '"new"'`).get() as { n: number };
    expect(indexed.n).toBe(remaining.n);
  });
});

describe("toFtsQuery", () => {
  it("quotes each word", () => {
    expect(toFtsQuery(' foo  "bar ')).toBe('"foo" """bar"');
    expect(toFtsQuery("   ")).toBeUndefined();
  });
});
