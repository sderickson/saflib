import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type Database from "better-sqlite3";

type Journal = {
  entries: { when: number; tag: string }[];
};

export type ReconcileLogger = {
  info: (message: string) => void;
  warn: (message: string) => void;
};

/**
 * After a migration squash (journal reset to a new baseline while existing DBs
 * still have old `__drizzle_migrations` rows), Drizzle would try to re-run the
 * baseline `CREATE TABLE` SQL and fail.
 *
 * Detection: applied history has timestamps not present in the current journal
 * ("orphans"), the journal has entries missing from history, and the DB already
 * has application tables. In that case, rewrite `__drizzle_migrations` to match
 * the current journal so migrate is a no-op for those entries.
 *
 * No-ops for fresh DBs and for normal incremental migrations (no orphans).
 */
export function reconcileSquashedMigrations(
  sqlite: Database.Database,
  migrationsFolder: string,
  log?: ReconcileLogger,
): boolean {
  const journalPath = path.join(migrationsFolder, "meta", "_journal.json");
  if (!fs.existsSync(journalPath)) {
    return false;
  }

  const journal = JSON.parse(fs.readFileSync(journalPath, "utf8")) as Journal;
  if (!journal.entries.length) {
    return false;
  }

  const migrationsTable = sqlite
    .prepare(
      `SELECT 1 AS ok FROM sqlite_master
       WHERE type = 'table' AND name = '__drizzle_migrations'`,
    )
    .get() as { ok: number } | undefined;
  if (!migrationsTable) {
    return false;
  }

  const applied = sqlite
    .prepare(`SELECT created_at FROM __drizzle_migrations`)
    .all() as { created_at: number | string }[];
  if (applied.length === 0) {
    return false;
  }

  const appliedWhens = new Set(applied.map((row) => Number(row.created_at)));
  const journalWhens = new Set(journal.entries.map((entry) => entry.when));

  const hasOrphans = [...appliedWhens].some((when) => !journalWhens.has(when));
  const missingFromHistory = journal.entries.filter(
    (entry) => !appliedWhens.has(entry.when),
  );
  if (!hasOrphans || missingFromHistory.length === 0) {
    return false;
  }

  const appTables = sqlite
    .prepare(
      `SELECT name FROM sqlite_master
       WHERE type = 'table'
         AND name NOT LIKE 'sqlite_%'
         AND name != '__drizzle_migrations'`,
    )
    .all() as { name: string }[];
  if (appTables.length === 0) {
    return false;
  }

  log?.warn(
    `Detected squashed migration history (${appliedWhens.size} applied rows, ` +
      `${missingFromHistory.length} journal entries missing). ` +
      `Marking current journal as applied without re-running SQL.`,
  );

  const insert = sqlite.prepare(
    `INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)`,
  );

  sqlite.transaction(() => {
    sqlite.prepare(`DELETE FROM __drizzle_migrations`).run();
    for (const entry of journal.entries) {
      const migrationPath = path.join(migrationsFolder, `${entry.tag}.sql`);
      const query = fs.readFileSync(migrationPath, "utf8");
      const hash = createHash("sha256").update(query).digest("hex");
      insert.run(hash, entry.when);
    }
  })();

  log?.info(
    `Rewrote __drizzle_migrations to ${journal.entries.length} journal entries.`,
  );
  return true;
}
