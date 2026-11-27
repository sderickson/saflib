import { describe, it, expect, afterEach } from "vitest";
import Database from "better-sqlite3";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { addPreMigrationHook, pendingMigrations, runPreMigrationHooks, type PreMigrationInfo } from "./pre-migration.ts";
import { DbManager } from "./instances.ts";
import config from "./drizzle.config.ts";
import * as schema from "./test-schema.ts";

const migrations = path.join(import.meta.dirname, "test-migrations");
const log = { info: () => {}, error: () => {} };

describe("pre-migration hooks", () => {
  let remove: (() => void) | undefined;
  afterEach(() => remove?.());

  it("finds migrations newer than the newest applied one", () => {
    const db = new Database(":memory:");
    expect(pendingMigrations(db, migrations)).toEqual([]);
    db.exec(`CREATE TABLE __drizzle_migrations (id INTEGER PRIMARY KEY, hash TEXT, created_at NUMERIC)`);
    expect(pendingMigrations(db, migrations)).toEqual([]);
    db.prepare(`INSERT INTO __drizzle_migrations (hash, created_at) VALUES ('h', 1746547722546)`).run();
    expect(pendingMigrations(db, migrations)).toEqual(["0001_absurd_songbird"]);
  });

  it("calls hooks only for on-disk databases with pending migrations, and survives a throwing hook", () => {
    const calls: PreMigrationInfo[] = [];
    remove = addPreMigrationHook((info) => calls.push(info));
    const throwing = addPreMigrationHook(() => {
      throw new Error("boom");
    });
    const db = new Database(":memory:");
    db.exec(`CREATE TABLE __drizzle_migrations (id INTEGER PRIMARY KEY, hash TEXT, created_at NUMERIC)`);
    db.prepare(`INSERT INTO __drizzle_migrations (hash, created_at) VALUES ('h', 1746547722546)`).run();
    const errors: string[] = [];
    runPreMigrationHooks(db, ":memory:", migrations, log);
    expect(calls).toHaveLength(0);
    runPreMigrationHooks(db, "/data/app.sqlite", migrations, { info: () => {}, error: (m) => errors.push(m) });
    expect(calls.map((c) => [c.path, c.pending])).toEqual([["/data/app.sqlite", ["0001_absurd_songbird"]]]);
    expect(errors[0]).toMatch(/boom/);
    throwing();
  });

  it("doesn't fire when a new database is created and migrated", () => {
    const calls: PreMigrationInfo[] = [];
    remove = addPreMigrationHook((info) => calls.push(info));
    const dir = mkdtempSync(path.join(tmpdir(), "premig-"));
    const manager = new DbManager(schema, config, import.meta.url);
    const key = manager.connect({ onDisk: path.join(dir, "fresh.sqlite"), overrideTestDefault: true });
    manager.disconnect(key);
    expect(calls).toHaveLength(0);
    rmSync(dir, { recursive: true, force: true });
  });
});
