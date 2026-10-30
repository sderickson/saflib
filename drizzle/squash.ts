import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  readSquashManifest,
  SQUASH_MANIFEST_PATH,
  type SquashRecord,
} from "./migration-history.ts";

type Journal = { entries: { when: number; tag: string }[] };

function readJournal(migrationsDir: string): Journal | null {
  const journalPath = path.join(migrationsDir, "meta", "_journal.json");
  if (!fs.existsSync(journalPath)) return null;
  return JSON.parse(fs.readFileSync(journalPath, "utf8")) as Journal;
}

export type SquashMigrationsOptions = {
  /** Migrations folder (drizzle config `out`), e.g. `<db package>/migrations`. */
  migrationsDir: string;
  /** Regenerates migrations from the schema; defaults to `drizzle-kit generate` in `cwd`. */
  generate?: () => void;
  /** Directory to run `drizzle-kit generate` in (the db package). */
  cwd?: string;
};

/**
 * Replaces every migration with one baseline generated from the current schema, and
 * records the squash in `meta/squash.json` so existing databases reconcile to the
 * baseline at startup (see checkMigrationHistory) instead of failing.
 */
export function squashMigrations(options: SquashMigrationsOptions): SquashRecord {
  const { migrationsDir } = options;
  const journal = readJournal(migrationsDir);
  if (journal == null || journal.entries.length === 0) {
    throw new Error(`No migrations to squash in ${migrationsDir}.`);
  }
  if (journal.entries.length === 1) {
    throw new Error(`${migrationsDir} has a single migration already.`);
  }
  const previous = readSquashManifest(migrationsDir);

  fs.rmSync(migrationsDir, { recursive: true, force: true });
  const generate =
    options.generate ??
    (() =>
      execFileSync("npx", ["drizzle-kit", "generate"], {
        cwd: options.cwd ?? process.cwd(),
        stdio: "inherit",
      }));
  generate();

  const baseline = readJournal(migrationsDir);
  if (baseline == null || baseline.entries.length !== 1) {
    throw new Error(
      `Expected one baseline migration in ${migrationsDir} after generating.`,
    );
  }

  const record: SquashRecord = {
    baseline: baseline.entries[0]!.when,
    replaces: journal.entries.map((entry) => entry.when),
    squashedAt: new Date().toISOString(),
  };
  fs.writeFileSync(
    path.join(migrationsDir, SQUASH_MANIFEST_PATH),
    `${JSON.stringify({ squashes: [...previous.squashes, record] }, null, 2)}\n`,
  );
  return record;
}
