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
import {
  checkMigrationHistory,
  MigrationHistoryError,
  type SquashManifest,
} from "./migration-history.ts";

const fixtureRoot = resolve(import.meta.dirname, "data/migration-history-fixture");

function writeJournal(dir: string, entries: { when: number; tag: string }[]) {
  mkdirSync(resolve(dir, "meta"), { recursive: true });
  writeFileSync(
    resolve(dir, "meta/_journal.json"),
    JSON.stringify(
      {
        version: "7",
        dialect: "sqlite",
        entries: entries.map((entry, idx) => ({ idx, ...entry })),
      },
      null,
      2,
    ),
  );
}

function writeMigration(dir: string, tag: string, sql: string) {
  writeFileSync(resolve(dir, `${tag}.sql`), sql);
}

function writeSquashManifest(dir: string, manifest: SquashManifest) {
  mkdirSync(resolve(dir, "meta"), { recursive: true });
  writeFileSync(resolve(dir, "meta/squash.json"), JSON.stringify(manifest));
}

function sha(sql: string) {
  return createHash("sha256").update(sql).digest("hex");
}

describe("checkMigrationHistory", () => {
  let sqlite: Database.Database;
  const migrationsDir = resolve(fixtureRoot, "migrations");

  function seedApplied(whens: number[]) {
    sqlite.exec(`
      CREATE TABLE __drizzle_migrations (
        id INTEGER PRIMARY KEY,
        hash text NOT NULL,
        created_at numeric
      );
      CREATE TABLE org (id text PRIMARY KEY);
    `);
    const insert = sqlite.prepare(
      `INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)`,
    );
    for (const when of whens) {
      insert.run(`hash-${when}`, when);
    }
  }

  function appliedRows() {
    return sqlite
      .prepare(
        `SELECT hash, created_at FROM __drizzle_migrations ORDER BY created_at`,
      )
      .all() as { hash: string; created_at: number }[];
  }

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

  it("allows pending migrations newer than the applied history", () => {
    seedApplied([1000]);
    writeMigration(migrationsDir, "0000_a", "CREATE TABLE org (id text);\n");
    writeMigration(migrationsDir, "0001_b", "ALTER TABLE org ADD name text;\n");
    writeJournal(migrationsDir, [
      { when: 1000, tag: "0000_a" },
      { when: 2000, tag: "0001_b" },
    ]);

    expect(checkMigrationHistory(sqlite, migrationsDir)).toBe(false);
    expect(appliedRows()).toHaveLength(1);
  });

  it("rewrites history to the baseline of a recorded squash", () => {
    seedApplied([1000, 2000]);
    const baselineSql = "CREATE TABLE org (id text PRIMARY KEY);\n";
    writeMigration(migrationsDir, "0000_baseline", baselineSql);
    writeMigration(migrationsDir, "0001_after", "ALTER TABLE org ADD name text;\n");
    writeJournal(migrationsDir, [
      { when: 9000, tag: "0000_baseline" },
      { when: 9500, tag: "0001_after" },
    ]);
    writeSquashManifest(migrationsDir, {
      squashes: [{ baseline: 9000, replaces: [1000, 2000] }],
    });

    expect(checkMigrationHistory(sqlite, migrationsDir)).toBe(true);
    // Only the baseline is marked applied; migrations added after the squash still run.
    expect(appliedRows()).toEqual([{ hash: sha(baselineSql), created_at: 9000 }]);
  });

  it("refuses applied migrations the code does not know about", () => {
    seedApplied([1000, 3000]);
    writeMigration(migrationsDir, "0000_a", "CREATE TABLE org (id text);\n");
    writeMigration(migrationsDir, "0001_mine", "ALTER TABLE org ADD name text;\n");
    writeJournal(migrationsDir, [
      { when: 1000, tag: "0000_a" },
      { when: 2000, tag: "0001_mine" },
    ]);

    expect(() => checkMigrationHistory(sqlite, migrationsDir)).toThrow(
      MigrationHistoryError,
    );
    expect(appliedRows()).toHaveLength(2);
  });

  it("refuses a squash the database was behind on", () => {
    seedApplied([1000]);
    writeMigration(migrationsDir, "0000_baseline", "CREATE TABLE org (id text);\n");
    writeJournal(migrationsDir, [{ when: 9000, tag: "0000_baseline" }]);
    writeSquashManifest(migrationsDir, {
      squashes: [{ baseline: 9000, replaces: [1000, 2000] }],
    });

    expect(() => checkMigrationHistory(sqlite, migrationsDir)).toThrow(
      /had not applied 1 of the migrations the squash replaced/,
    );
  });

  it("refuses a pending migration older than the newest applied one", () => {
    seedApplied([1000, 3000]);
    writeMigration(migrationsDir, "0000_a", "CREATE TABLE org (id text);\n");
    writeMigration(migrationsDir, "0001_b", "ALTER TABLE org ADD name text;\n");
    writeMigration(migrationsDir, "0002_c", "ALTER TABLE org ADD note text;\n");
    writeJournal(migrationsDir, [
      { when: 1000, tag: "0000_a" },
      { when: 2000, tag: "0001_b" },
      { when: 3000, tag: "0002_c" },
    ]);

    expect(() => checkMigrationHistory(sqlite, migrationsDir)).toThrow(
      /0001_b .* would be skipped/,
    );
  });

  it("is a no-op when the migrations table is missing", () => {
    writeMigration(migrationsDir, "0000_baseline", "CREATE TABLE org (id text);\n");
    writeJournal(migrationsDir, [{ when: 9000, tag: "0000_baseline" }]);

    expect(checkMigrationHistory(sqlite, migrationsDir)).toBe(false);
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
