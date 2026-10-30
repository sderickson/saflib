import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { squashMigrations } from "./squash.ts";

const fixtureRoot = resolve(import.meta.dirname, "data/squash-fixture");
const migrationsDir = resolve(fixtureRoot, "migrations");

function writeJournal(entries: { when: number; tag: string }[]) {
  mkdirSync(resolve(migrationsDir, "meta"), { recursive: true });
  writeFileSync(
    resolve(migrationsDir, "meta/_journal.json"),
    JSON.stringify({ entries: entries.map((entry, idx) => ({ idx, ...entry })) }),
  );
  for (const entry of entries) {
    writeFileSync(resolve(migrationsDir, `${entry.tag}.sql`), "SELECT 1;\n");
  }
}

describe("squashMigrations", () => {
  beforeEach(() => {
    rmSync(fixtureRoot, { recursive: true, force: true });
  });
  afterEach(() => {
    rmSync(fixtureRoot, { recursive: true, force: true });
  });

  it("replaces the migrations with a baseline and records the squash", () => {
    writeJournal([
      { when: 1000, tag: "0000_a" },
      { when: 2000, tag: "0001_b" },
    ]);

    const record = squashMigrations({
      migrationsDir,
      generate: () => writeJournal([{ when: 9000, tag: "0000_baseline" }]),
    });

    expect(record).toMatchObject({ baseline: 9000, replaces: [1000, 2000] });
    expect(existsSync(resolve(migrationsDir, "0001_b.sql"))).toBe(false);
    const manifest = JSON.parse(
      readFileSync(resolve(migrationsDir, "meta/squash.json"), "utf8"),
    );
    expect(manifest.squashes).toEqual([record]);
  });

  it("refuses when there is nothing to squash", () => {
    writeJournal([{ when: 1000, tag: "0000_a" }]);
    expect(() =>
      squashMigrations({ migrationsDir, generate: () => {} }),
    ).toThrow(/single migration/);
  });
});
