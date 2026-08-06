import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { createHash } from "node:crypto";
import {
  mkdirSync,
  writeFileSync,
  rmSync,
  existsSync,
  readFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { reconcileSquashedMigrations } from "./reconcile-squashed-migrations.ts";

const fixtureRoot = resolve(
  import.meta.dirname,
  "data/reconcile-squash-fixture",
);

function writeJournal(
  dir: string,
  entries: { idx: number; when: number; tag: string }[],
) {
  mkdirSync(resolve(dir, "meta"), { recursive: true });
  writeFileSync(
    resolve(dir, "meta/_journal.json"),
    JSON.stringify({ version: "7", dialect: "sqlite", entries }, null, 2),
  );
}

function writeMigration(dir: string, tag: string, sql: string) {
  writeFileSync(resolve(dir, `${tag}.sql`), sql);
}

function sha(sql: string) {
  return createHash("sha256").update(sql).digest("hex");
}

describe("reconcileSquashedMigrations", () => {
  let sqlite: Database.Database;
  const migrationsDir = resolve(fixtureRoot, "migrations");

  beforeEach(() => {
    if (existsSync(fixtureRoot)) {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
    mkdirSync(migrationsDir, { recursive: true });
    sqlite = new Database(":memory:");
  });

  afterEach(() => {
    sqlite.close();
    if (existsSync(fixtureRoot)) {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });

  it("rewrites history when journal was squashed under an existing schema", () => {
    sqlite.exec(`
      CREATE TABLE __drizzle_migrations (
        id INTEGER PRIMARY KEY,
        hash text NOT NULL,
        created_at numeric
      );
      CREATE TABLE org (id text PRIMARY KEY);
      INSERT INTO __drizzle_migrations (hash, created_at) VALUES ('old-a', 1000);
      INSERT INTO __drizzle_migrations (hash, created_at) VALUES ('old-b', 2000);
    `);

    const baselineSql = "CREATE TABLE org (id text PRIMARY KEY);\n";
    writeMigration(migrationsDir, "0000_baseline", baselineSql);
    writeJournal(migrationsDir, [
      {
        idx: 0,
        when: 9000,
        tag: "0000_baseline",
      },
    ]);

    const didReconcile = reconcileSquashedMigrations(sqlite, migrationsDir);
    expect(didReconcile).toBe(true);

    const rows = sqlite
      .prepare(
        `SELECT hash, created_at FROM __drizzle_migrations ORDER BY created_at`,
      )
      .all() as { hash: string; created_at: number }[];
    expect(rows).toEqual([{ hash: sha(baselineSql), created_at: 9000 }]);
  });

  it("is a no-op for normal incremental migrations", () => {
    const sql0 = "CREATE TABLE org (id text PRIMARY KEY);\n";
    const sql1 = "ALTER TABLE org ADD COLUMN name text;\n";
    writeMigration(migrationsDir, "0000_base", sql0);
    writeMigration(migrationsDir, "0001_add_name", sql1);
    writeJournal(migrationsDir, [
      { idx: 0, when: 1000, tag: "0000_base" },
      { idx: 1, when: 2000, tag: "0001_add_name" },
    ]);

    sqlite.exec(`
      CREATE TABLE __drizzle_migrations (
        id INTEGER PRIMARY KEY,
        hash text NOT NULL,
        created_at numeric
      );
      CREATE TABLE org (id text PRIMARY KEY);
      INSERT INTO __drizzle_migrations (hash, created_at)
        VALUES ('${sha(sql0)}', 1000);
    `);

    // New migration 0001 is pending, but there are no orphan timestamps.
    const didReconcile = reconcileSquashedMigrations(sqlite, migrationsDir);
    expect(didReconcile).toBe(false);

    const rows = sqlite
      .prepare(`SELECT created_at FROM __drizzle_migrations`)
      .all() as { created_at: number }[];
    expect(rows).toEqual([{ created_at: 1000 }]);
  });

  it("is a no-op on a fresh database with no app tables", () => {
    writeMigration(migrationsDir, "0000_baseline", "CREATE TABLE org (id text);\n");
    writeJournal(migrationsDir, [
      { idx: 0, when: 9000, tag: "0000_baseline" },
    ]);

    sqlite.exec(`
      CREATE TABLE __drizzle_migrations (
        id INTEGER PRIMARY KEY,
        hash text NOT NULL,
        created_at numeric
      );
      INSERT INTO __drizzle_migrations (hash, created_at) VALUES ('orphan', 1000);
    `);

    const didReconcile = reconcileSquashedMigrations(sqlite, migrationsDir);
    expect(didReconcile).toBe(false);
  });

  it("is a no-op when migrations table is missing", () => {
    writeMigration(migrationsDir, "0000_baseline", "CREATE TABLE org (id text);\n");
    writeJournal(migrationsDir, [
      { idx: 0, when: 9000, tag: "0000_baseline" },
    ]);
    sqlite.exec(`CREATE TABLE org (id text PRIMARY KEY);`);

    expect(reconcileSquashedMigrations(sqlite, migrationsDir)).toBe(false);
  });

  it("reads the real journal fixture shape", () => {
    // sanity: journal parse doesn't choke on drizzle-kit formatting
    const journal = JSON.parse(
      readFileSync(
        resolve(import.meta.dirname, "test-migrations/meta/_journal.json"),
        "utf8",
      ),
    );
    expect(journal.entries.length).toBeGreaterThan(0);
  });
});
