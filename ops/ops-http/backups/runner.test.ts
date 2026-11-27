import { describe, it, expect } from "vitest";
import Database from "better-sqlite3";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { opsDb } from "@saflib/ops-db";
import { TestObjectStore } from "@saflib/object-store";
import {
  applyBackupRetention,
  recentBackups,
  runBackup,
  runDueBackups,
  verifyLatestBackups,
  type BackupContext,
} from "./runner.ts";

function makeDb(rows: number) {
  const path = join(mkdtempSync(join(tmpdir(), "bk-")), "main.sqlite");
  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  db.exec(`CREATE TABLE users (id INTEGER PRIMARY KEY, created_at INTEGER, updated_at INTEGER)`);
  const ins = db.prepare(`INSERT INTO users (created_at, updated_at) VALUES (?, ?)`);
  for (let i = 0; i < rows; i++) ins.run(1000 + i, 2000 + i);
  return { path, db };
}

function setup(rows = 50) {
  const live = makeDb(rows);
  const store = new TestObjectStore();
  let now = new Date("2026-11-27T04:00:00Z");
  const ctx: BackupContext = {
    dbKey: opsDb.connect(),
    config: { databases: [{ name: "main", path: live.path }], store, retentionDays: 14 },
    now: () => now,
  };
  return { ctx, live, store, setNow: (d: string) => (now = new Date(d)) };
}

describe("backups", () => {
  it("backs up with stats, uploads with a hash, and runs the daily once per day", async () => {
    const { ctx, store } = setup();
    const [b] = await runDueBackups(ctx);
    expect(b).toMatchObject({ status: "ok", database: "main", tag: "daily" });
    expect(JSON.parse(b!.stats!).tables.users).toEqual({ rows: 50, created_min: 1000, created_max: 1049, updated_min: 2000, updated_max: 2049 });
    expect(b!.object_key).toMatch(/^backups\/main\/2026-11-27\/.+-daily\.sqlite\.zst$/);
    expect(store.getFiles().map((f) => f.path)).toEqual([b!.object_key]);
    expect(await runDueBackups(ctx)).toEqual([]);
  });

  it("waits for the daily hour", async () => {
    const { ctx, setNow } = setup();
    setNow("2026-11-27T01:00:00Z");
    expect(await runDueBackups(ctx)).toEqual([]);
  });

  it("flags a backup whose tables shrank since the last good one", async () => {
    const { ctx, live, setNow } = setup(100);
    await runBackup(ctx, ctx.config.databases[0]!, "manual", "m1");
    live.db.exec(`DELETE FROM users WHERE id > 50`);
    setNow("2026-11-27T05:00:00Z");
    const b = await runBackup(ctx, ctx.config.databases[0]!, "manual", "m2");
    expect(b?.status).toBe("suspicious");
    expect(JSON.parse(b!.problems!)).toEqual(["users: 100 → 50 rows (−50%)"]);
  });

  it("records a failure when the database can't be read", async () => {
    const { ctx } = setup();
    const b = await runBackup(ctx, { name: "gone", path: "/nonexistent/x.sqlite" }, "manual", "m3");
    expect(b).toMatchObject({ status: "failed" });
    expect(b!.error).toBeTruthy();
  });

  it("deletes backups past retention but keeps the latest passed one", async () => {
    const { ctx, store, setNow, live } = setup(100);
    setNow("2026-11-01T04:00:00Z");
    const old = await runDueBackups(ctx);
    setNow("2026-11-02T04:00:00Z");
    const passed = await runDueBackups(ctx);
    live.db.exec(`DELETE FROM users`);
    setNow("2026-11-03T04:00:00Z");
    const bad = await runDueBackups(ctx);
    expect(bad[0]?.status).toBe("suspicious");
    setNow("2026-11-27T04:00:00Z");
    expect(await applyBackupRetention(ctx)).toBe(2);
    const kept = await recentBackups(ctx, 365);
    expect(kept.map((b) => b.id)).toEqual([passed[0]!.id]);
    expect(store.getFiles().map((f) => f.path)).toEqual([passed[0]!.object_key]);
    expect(old[0]!.id).not.toBe(passed[0]!.id);
  });

  it("reads back the latest backup and catches a changed object", async () => {
    const { ctx, store, setNow } = setup();
    const [b] = await runDueBackups(ctx);
    expect(await verifyLatestBackups(ctx)).toEqual([{ id: b!.id, ok: true }]);
    expect(await verifyLatestBackups(ctx)).toEqual([]);
    // Stores refuse to overwrite, so replace it the long way.
    await store.deleteFile(b!.object_key!);
    await store.uploadFile(b!.object_key!, Readable.from([Buffer.from("tampered")]));
    setNow("2026-12-05T04:00:00Z");
    expect(await verifyLatestBackups(ctx)).toEqual([{ id: b!.id, ok: false }]);
  });
});

describe("pre-migration snapshots", () => {
  it("uploads snapshots as pre-migration backups of their database, then removes them", async () => {
    const { mkdirSync, writeFileSync, existsSync, readdirSync } = await import("node:fs");
    const { uploadPreMigrationSnapshots } = await import("./pre-migration.ts");
    const { ctx, live } = setup(10);
    const dir = join(mkdtempSync(join(tmpdir(), "pm-")), "pre-migration");
    mkdirSync(dir);
    const snap = join(dir, "main-2026-11-27T04-00-00-000Z.sqlite");
    live.db.prepare("VACUUM INTO ?").run(snap);
    writeFileSync(`${snap}.json`, JSON.stringify({ source: live.path, pending: ["0042_x"] }));
    expect(await uploadPreMigrationSnapshots(ctx, dir)).toBe(1);
    const [b] = await recentBackups(ctx);
    expect(b).toMatchObject({ database: "main", tag: "pre-migration", status: "ok" });
    expect(existsSync(snap)).toBe(false);
    expect(readdirSync(dir)).toEqual([]);
  });
});
