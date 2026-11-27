import Database from "better-sqlite3";

export interface TableStats {
  rows: number;
  created_min?: string | number | null;
  created_max?: string | number | null;
  updated_min?: string | number | null;
  updated_max?: string | number | null;
}

export interface SqliteInspection {
  /** `ok`, or SQLite's first complaint. */
  integrity: string;
  /** Latest migration: drizzle's newest hash, or Kratos's newest version. */
  migration: string | null;
  tables: Record<string, TableStats>;
}

const quote = (name: string) => `"${name.replace(/"/g, '""')}"`;

/** Integrity, migration and per-table stats of a SQLite file (opened read-only). */
export function inspectSqlite(path: string): SqliteInspection {
  const db = new Database(path, { readonly: true, fileMustExist: true });
  try {
    const integrity = String((db.prepare("PRAGMA integrity_check").get() as Record<string, unknown>)?.integrity_check ?? "unknown");
    const tableNames = (
      db.prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'`).all() as { name: string }[]
    ).map((t) => t.name);

    let migration: string | null = null;
    if (tableNames.includes("__drizzle_migrations")) {
      const m = db.prepare(`SELECT hash FROM __drizzle_migrations ORDER BY created_at DESC LIMIT 1`).get() as { hash?: string } | undefined;
      migration = m?.hash ? `drizzle:${m.hash.slice(0, 12)}` : null;
    } else if (tableNames.includes("schema_migration")) {
      const m = db.prepare(`SELECT version FROM schema_migration ORDER BY version DESC LIMIT 1`).get() as { version?: string } | undefined;
      migration = m?.version ? `kratos:${m.version}` : null;
    }

    const tables: Record<string, TableStats> = {};
    for (const name of tableNames) {
      // FTS shadow tables and the like add noise; skip virtual-table internals.
      if (/_(data|idx|docsize|config|content)$/.test(name) && tableNames.includes(name.replace(/_(data|idx|docsize|config|content)$/, ""))) continue;
      const cols = new Set((db.prepare(`PRAGMA table_info(${quote(name)})`).all() as { name: string }[]).map((c) => c.name));
      const parts = ["count(*) AS rows"];
      if (cols.has("created_at")) parts.push("min(created_at) AS created_min", "max(created_at) AS created_max");
      if (cols.has("updated_at")) parts.push("min(updated_at) AS updated_min", "max(updated_at) AS updated_max");
      tables[name] = db.prepare(`SELECT ${parts.join(", ")} FROM ${quote(name)}`).get() as TableStats;
    }
    return { integrity, migration, tables };
  } finally {
    db.close();
  }
}

/**
 * Why a backup looks wrong compared with the last good one: a table that
 * went empty, or shrank by more than `threshold` (small tables ignored).
 */
export function compareStats(
  previous: Record<string, TableStats> | undefined,
  current: Record<string, TableStats>,
  threshold = 0.1,
): string[] {
  if (!previous) return [];
  const problems: string[] = [];
  for (const [name, prev] of Object.entries(previous)) {
    const cur = current[name];
    if (!cur) {
      if (prev.rows > 0) problems.push(`${name}: table is gone (had ${prev.rows} rows)`);
      continue;
    }
    if (prev.rows > 0 && cur.rows === 0) problems.push(`${name}: now empty (had ${prev.rows} rows)`);
    else if (prev.rows >= 20 && cur.rows < prev.rows * (1 - threshold)) {
      problems.push(`${name}: ${prev.rows} → ${cur.rows} rows (−${Math.round((1 - cur.rows / prev.rows) * 100)}%)`);
    }
  }
  return problems;
}
