import { afterEach, beforeEach, describe, expect, it } from "vitest";
import winston from "winston";
import type { DbKey } from "@saflib/drizzle";
import { throwError } from "@saflib/utils";
import {
  createPersistentLogTransport,
  listLogGroups,
  listLogs,
  logsDb,
  pruneLogs,
  type PersistentLogTransport,
} from "./index.ts";
import { logsDbManager } from "./instances.ts";

describe("log contexts and groups", () => {
  let dbKey: DbKey;
  let transport: PersistentLogTransport;
  let logger: winston.Logger;

  const ctx = (kind: string | undefined, id: string | undefined, user = "u_1") =>
    logger.child({
      service_name: "svc",
      operation_name: "op",
      request_id: kind === "request" ? id : "-",
      user_id: user,
      ...(kind ? { context_kind: kind, context_id: id } : {}),
    });

  beforeEach(() => {
    dbKey = logsDb.connect();
    transport = createPersistentLogTransport({ getDbKey: () => dbKey, flushIntervalMs: 60_000, minLevel: "http" });
    logger = winston.createLogger({ level: "debug", transports: [transport] });
  });
  afterEach(() => transport.close());

  it("persists context, filters by it, and groups lines newest first", async () => {
    const r1 = ctx("request", "r1");
    r1.info("loading");
    r1.warn("slow");
    r1.http("GET /matters/:id", { method: "GET", route: "/matters/:id", status: 200, duration_ms: 42, internal: false });
    ctx(undefined, undefined, "-").info("cache evicted");
    const j1 = ctx("job", "j1", "u_2");
    j1.info("job started");
    j1.error("job failed");
    transport.flush();

    const byContext = await throwError(listLogs(dbKey, { contextId: "r1" }));
    expect(byContext.entries.map((e) => e.message)).toEqual(["GET /matters/:id", "slow", "loading"]);
    expect(byContext.entries[0]).toMatchObject({ context_kind: "request", context_id: "r1" });

    const { groups, nextCursor } = await throwError(listLogGroups(dbKey, {}));
    expect(nextCursor).toBeNull();
    expect(groups.map((g) => g.kind)).toEqual(["job", null, "request"]);
    const [job, lone, request] = groups;
    expect(job).toMatchObject({ context_id: "j1", count: 2, errors: 1, user_id: "u_2", first_message: "job started" });
    expect(lone).toMatchObject({ context_id: null, count: 1, first_message: "cache evicted" });
    expect(lone!.line_id).toBeTypeOf("number");
    expect(request).toMatchObject({
      count: 2,
      warnings: 1,
      request: { method: "GET", route: "/matters/:id", status: 200, duration_ms: 42, internal: false },
    });
  });

  it("filters groups by level, user and text, counting all their lines", async () => {
    ctx("request", "quiet").info("all good");
    const noisy = ctx("request", "noisy", "u_9");
    noisy.info("starting");
    noisy.warn("retrying upstream");
    transport.flush();

    const warnUp = await throwError(listLogGroups(dbKey, { minLevel: "warn" }));
    expect(warnUp.groups.map((g) => g.context_id)).toEqual(["noisy"]);
    expect(warnUp.groups[0]!.count).toBe(2);
    const byUser = await throwError(listLogGroups(dbKey, { userId: "u_9" }));
    expect(byUser.groups.map((g) => g.context_id)).toEqual(["noisy"]);
    const byText = await throwError(listLogGroups(dbKey, { q: "good" }));
    expect(byText.groups.map((g) => g.context_id)).toEqual(["quiet"]);
  });

  it("pages groups by their newest matching line", async () => {
    for (const id of ["a", "b", "c"]) ctx("request", id).info(`line ${id}`);
    transport.flush();
    const p1 = await throwError(listLogGroups(dbKey, { limit: 2 }));
    expect(p1.groups.map((g) => g.context_id)).toEqual(["c", "b"]);
    const p2 = await throwError(listLogGroups(dbKey, { limit: 2, cursor: p1.nextCursor! }));
    expect(p2.groups.map((g) => g.context_id)).toEqual(["a"]);
    expect(p2.nextCursor).toBeNull();
  });

  it("keeps http lines for a shorter time than other lines", () => {
    const c = logsDbManager.get(dbKey)!.$client;
    const insert = c.prepare(
      `INSERT INTO log_entries (ts, level, level_num, template_hash, message) VALUES (?, ?, ?, 'h', 'x')`,
    );
    const tenDaysAgo = Date.now() - 10 * 86_400_000;
    insert.run(tenDaysAgo, "http", 3);
    insert.run(tenDaysAgo, "info", 2);
    const result = pruneLogs(dbKey, { maxBytes: 1e12 });
    expect(result.byAge).toBe(1);
    const left = c.prepare(`SELECT level FROM log_entries`).all() as { level: string }[];
    expect(left.map((r) => r.level)).toEqual(["info"]);
  });
});
