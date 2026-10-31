import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type Database from "better-sqlite3";

type Journal = {
  entries: { when: number; tag: string }[];
};

/** One deliberate squash, recorded by `saf-drizzle squash` in `meta/squash.json`. */
export type SquashRecord = {
  /** Journal `when` of the baseline migration the squash produced. */
  baseline: number;
  /** Journal `when`s of the migrations the baseline replaced. */
  replaces: number[];
  /** ISO time the squash was made. */
  squashedAt?: string;
};

export type SquashManifest = { squashes: SquashRecord[] };

export const SQUASH_MANIFEST_PATH = path.join("meta", "squash.json");

export type MigrationHistoryLogger = {
  info: (message: string) => void;
  warn: (message: string) => void;
};

/**
 * The database's applied migrations do not line up with this code's migrations, so
 * migrating would silently skip or misapply them. Startup stops instead.
 */
export class MigrationHistoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MigrationHistoryError";
  }
}

export function readSquashManifest(migrationsFolder: string): SquashManifest {
  const manifestPath = path.join(migrationsFolder, SQUASH_MANIFEST_PATH);
  if (!fs.existsSync(manifestPath)) {
    return { squashes: [] };
  }
  return JSON.parse(fs.readFileSync(manifestPath, "utf8")) as SquashManifest;
}

function formatWhens(whens: readonly number[]): string {
  return whens
    .map((when) => `${new Date(when).toISOString()} (${when})`)
    .join(", ");
}

function migrationHash(migrationsFolder: string, tag: string): string {
  const query = fs.readFileSync(path.join(migrationsFolder, `${tag}.sql`), "utf8");
  return createHash("sha256").update(query).digest("hex");
}

/**
 * Checks `__drizzle_migrations` against the migrations folder before `migrate()`.
 *
 * - Applied migrations all in the journal: fine; drizzle applies what is pending.
 * - Applied migrations missing from the journal that a recorded squash (`meta/squash.json`)
 *   replaced, with every replaced migration applied: rewrites history to the squash
 *   baseline, so the baseline SQL is not re-run on an existing schema. Returns true.
 * - Any other applied migration missing from the journal (e.g. the database was migrated
 *   by another branch), or a pending migration older than the newest applied one (drizzle
 *   would silently skip it): throws {@link MigrationHistoryError}.
 */
export function checkMigrationHistory(
  sqlite: Database.Database,
  migrationsFolder: string,
  log?: MigrationHistoryLogger,
): boolean {
  const journalPath = path.join(migrationsFolder, "meta", "_journal.json");
  if (!fs.existsSync(journalPath)) {
    return false;
  }
  const journal = JSON.parse(fs.readFileSync(journalPath, "utf8")) as Journal;

  const migrationsTable = sqlite
    .prepare(
      `SELECT 1 AS ok FROM sqlite_master
       WHERE type = 'table' AND name = '__drizzle_migrations'`,
    )
    .get() as { ok: number } | undefined;
  if (!migrationsTable) {
    return false;
  }

  const applied = new Set(
    (
      sqlite.prepare(`SELECT created_at FROM __drizzle_migrations`).all() as {
        created_at: number | string;
      }[]
    ).map((row) => Number(row.created_at)),
  );
  if (applied.size === 0) {
    return false;
  }

  const journalWhens = new Set(journal.entries.map((entry) => entry.when));
  const unknown = [...applied].filter((when) => !journalWhens.has(when))
    .sort((a, b) => a - b);

  let reconciled = false;
  if (unknown.length > 0) {
    const squash = readSquashManifest(migrationsFolder).squashes.find(
      (record) =>
        journalWhens.has(record.baseline) &&
        !applied.has(record.baseline) &&
        unknown.every((when) => record.replaces.includes(when)),
    );
    if (squash == null) {
      throw new MigrationHistoryError(
        `The database has ${unknown.length} applied migration(s) that are not in ` +
          `${migrationsFolder}: ${formatWhens(unknown)}. It was probably migrated by ` +
          `code from another branch. Check out that code, restore a copy of the ` +
          `database from before those migrations, or delete the database to recreate ` +
          `it. If the migrations were squashed, record the squash with ` +
          `\`saf-drizzle squash\`.`,
      );
    }
    const neverApplied = squash.replaces.filter((when) => !applied.has(when));
    if (neverApplied.length > 0) {
      throw new MigrationHistoryError(
        `The migrations in ${migrationsFolder} were squashed, but this database had ` +
          `not applied ${neverApplied.length} of the migrations the squash replaced: ` +
          `${formatWhens(neverApplied)}. Migrate it with code from before the squash ` +
          `first, or delete it to recreate it.`,
      );
    }

    log?.warn(
      `Database history predates the squash to baseline ${squash.baseline}; ` +
        `marking the baseline as applied without re-running its SQL.`,
    );
    const insert = sqlite.prepare(
      `INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)`,
    );
    const covered = journal.entries.filter(
      (entry) => entry.when <= squash.baseline,
    );
    sqlite.transaction(() => {
      sqlite.prepare(`DELETE FROM __drizzle_migrations`).run();
      for (const entry of covered) {
        insert.run(migrationHash(migrationsFolder, entry.tag), entry.when);
      }
    })();
    applied.clear();
    for (const entry of covered) {
      applied.add(entry.when);
    }
    reconciled = true;
  }

  const newestApplied = Math.max(...applied);
  const skipped = journal.entries
    .filter((entry) => !applied.has(entry.when) && entry.when < newestApplied)
    .map((entry) => entry.tag);
  if (skipped.length > 0) {
    throw new MigrationHistoryError(
      `Migration(s) ${skipped.join(", ")} in ${migrationsFolder} are not applied but ` +
        `are older than the newest applied migration, so they would be skipped. The ` +
        `database was probably migrated by code from another branch. Restore a copy of ` +
        `the database from before that, or delete it to recreate it.`,
    );
  }

  return reconciled;
}
