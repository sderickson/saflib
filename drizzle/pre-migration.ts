import fs from "node:fs";
import path from "node:path";
import type Database from "better-sqlite3";

/** What a pre-migration hook is told: the file, its open connection and the migrations about to run. */
export interface PreMigrationInfo {
  path: string;
  sqlite: Database.Database;
  pending: string[];
}

export type PreMigrationHook = (info: PreMigrationInfo) => void;

const hooks: PreMigrationHook[] = [];

/**
 * Run `hook` right before migrations are applied to an existing on-disk
 * database (not new or in-memory ones). Used to snapshot the database first,
 * so a bad migration can be undone. Hooks are synchronous and must not
 * throw; a failing hook is logged and migrations still run.
 */
export function addPreMigrationHook(hook: PreMigrationHook): () => void {
  hooks.push(hook);
  return () => {
    const i = hooks.indexOf(hook);
    if (i >= 0) hooks.splice(i, 1);
  };
}

export function hasPreMigrationHooks(): boolean {
  return hooks.length > 0;
}

/**
 * Migrations in the journal newer than the newest applied one. Empty for a
 * database with no migration history yet (a new database has nothing to save).
 */
export function pendingMigrations(sqlite: Database.Database, migrationsFolder: string): string[] {
  const journalPath = path.join(migrationsFolder, "meta", "_journal.json");
  if (!fs.existsSync(journalPath)) return [];
  const table = sqlite
    .prepare(`SELECT 1 AS ok FROM sqlite_master WHERE type = 'table' AND name = '__drizzle_migrations'`)
    .get();
  if (!table) return [];
  const row = sqlite.prepare(`SELECT max(created_at) AS newest FROM __drizzle_migrations`).get() as { newest: number | string | null };
  if (row.newest === null) return [];
  const newest = Number(row.newest);
  const journal = JSON.parse(fs.readFileSync(journalPath, "utf8")) as { entries: { when: number; tag: string }[] };
  return journal.entries.filter((e) => e.when > newest).map((e) => e.tag);
}

/** Call the hooks for `dbPath` when it has pending migrations. Never throws. */
export function runPreMigrationHooks(
  sqlite: Database.Database,
  dbPath: string,
  migrationsFolder: string,
  log: { info: (m: string) => void; error: (m: string) => void },
): void {
  if (!hooks.length || dbPath === ":memory:") return;
  let pending: string[];
  try {
    pending = pendingMigrations(sqlite, migrationsFolder);
  } catch (e) {
    log.error(`pre-migration: couldn't read pending migrations: ${e instanceof Error ? e.message : String(e)}`);
    return;
  }
  if (!pending.length) return;
  for (const hook of hooks) {
    try {
      hook({ path: dbPath, sqlite, pending });
      log.info(`pre-migration hook ran for ${dbPath} (${pending.length} pending)`);
    } catch (e) {
      log.error(`pre-migration hook failed for ${dbPath}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}
