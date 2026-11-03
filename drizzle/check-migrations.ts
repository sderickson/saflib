import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * Migrations must work with the previous release's code: a blue-green deploy
 * migrates while the old version still serves, and a rollback runs the old
 * code on the migrated schema. So a migration may add (tables, nullable or
 * defaulted columns, indexes); dropping or renaming waits for a later release
 * ("contract"), once no deployed code uses the old shape.
 *
 * This flags SQL that breaks that rule. A migration that breaks it on purpose
 * says so with a `-- saf: contract` comment.
 */
export const CONTRACT_MARKER = "-- saf: contract";

export interface MigrationWarning {
  file: string;
  statement: string;
  reason: string;
}

const statementsOf = (sql: string) =>
  sql
    .split(/--> statement-breakpoint|;\s*\n/)
    .map((s) =>
      s
        .split("\n")
        .filter((line) => !line.trim().startsWith("--"))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter(Boolean);

const unquote = (name: string) => name.replace(/[`"[\]]/g, "");

/** The statements in `sql` that the previous release's code may not survive. */
export function checkMigrationSql(
  sql: string,
  file = "migration",
): MigrationWarning[] {
  if (sql.includes(CONTRACT_MARKER)) return [];
  const statements = statementsOf(sql);
  // drizzle-kit rebuilds a SQLite table as: CREATE `__new_x`, copy, DROP `x`,
  // RENAME `__new_x` TO `x`.
  const rebuilt = new Set(
    statements
      .map((s) =>
        /^ALTER TABLE [`"]?__new_(\w+)[`"]? RENAME TO [`"]?(\w+)[`"]?/i.exec(s),
      )
      .filter((m): m is RegExpExecArray => m !== null && m[1] === m[2])
      .map((m) => m[2]!),
  );
  const warnings: MigrationWarning[] = [];
  const warn = (statement: string, reason: string) =>
    warnings.push({ file, statement, reason });
  for (const s of statements) {
    const dropTable = /^DROP TABLE (?:IF EXISTS )?([`"[\]\w]+)/i.exec(s);
    if (dropTable) {
      const table = unquote(dropTable[1]!);
      if (rebuilt.has(table)) {
        warn(
          s,
          `rebuilds table ${table}: check it keeps every column the previous release reads or writes`,
        );
      } else {
        warn(s, `drops table ${table}`);
      }
      continue;
    }
    if (/^ALTER TABLE .* DROP COLUMN /i.test(s)) {
      warn(s, "drops a column");
    } else if (/^ALTER TABLE .* RENAME COLUMN /i.test(s)) {
      warn(s, "renames a column");
    } else if (
      /^ALTER TABLE .* RENAME TO /i.test(s) &&
      !/^ALTER TABLE [`"]?__new_/i.test(s)
    ) {
      warn(s, "renames a table");
    } else if (
      /^ALTER TABLE .* ADD (COLUMN )?/i.test(s) &&
      /\bNOT NULL\b/i.test(s) &&
      !/\bDEFAULT\b/i.test(s)
    ) {
      warn(s, "adds a NOT NULL column without a default");
    }
  }
  return warnings;
}

/** The newest migration's SQL file, from drizzle's journal. */
export function latestMigration(migrationsDir: string): string | undefined {
  const journal = path.join(migrationsDir, "meta", "_journal.json");
  if (!existsSync(journal)) return undefined;
  const entries = (
    JSON.parse(readFileSync(journal, "utf8")) as { entries: { tag: string }[] }
  ).entries;
  const tag = entries.at(-1)?.tag;
  return tag ? path.join(migrationsDir, `${tag}.sql`) : undefined;
}

/** Migration SQL files added since `ref` (e.g. `origin/main`). */
export function migrationsSince(migrationsDir: string, ref: string): string[] {
  const out = execFileSync(
    "git",
    ["diff", "--name-only", "--diff-filter=A", `${ref}...HEAD`, "--", migrationsDir],
    { encoding: "utf8", cwd: migrationsDir },
  );
  const root = execFileSync("git", ["rev-parse", "--show-toplevel"], {
    encoding: "utf8",
    cwd: migrationsDir,
  }).trim();
  return out
    .split("\n")
    .filter((f) => f.endsWith(".sql"))
    .map((f) => path.join(root, f));
}

/** Every migration SQL file in the folder. */
export function allMigrations(migrationsDir: string): string[] {
  return readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => path.join(migrationsDir, f));
}

export function checkMigrationFiles(files: string[]): MigrationWarning[] {
  return files.flatMap((file) =>
    checkMigrationSql(readFileSync(file, "utf8"), file),
  );
}
