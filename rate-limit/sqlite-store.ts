import Database from "better-sqlite3";
import type { RateLimitStore } from "./store.ts";

export interface SqliteStoreOptions {
  /** SQLite file. Put it on the shared data volume so every process (and blue/green) shares counts. */
  path: string;
  /** Separates limiters sharing one file, e.g. `product-events:ip`. */
  name: string;
}

const connections = new Map<string, Database.Database>();

function open(path: string): Database.Database {
  let db = connections.get(path);
  if (!db) {
    db = new Database(path);
    db.pragma("journal_mode = WAL");
    db.pragma("busy_timeout = 2000");
    db.pragma("synchronous = NORMAL");
    db.exec(`CREATE TABLE IF NOT EXISTS rate_limit_windows (
      name TEXT NOT NULL,
      key TEXT NOT NULL,
      window_start INTEGER NOT NULL,
      count INTEGER NOT NULL,
      PRIMARY KEY (name, key, window_start)
    ) WITHOUT ROWID`);
    connections.set(path, db);
  }
  return db;
}

/**
 * Counts in a SQLite file: they survive restarts and deploys, and processes
 * sharing the file share the counts. One upsert per hit (tens of µs).
 */
export function createSqliteStore(options: SqliteStoreOptions): RateLimitStore {
  const db = open(options.path);
  const inc = db.prepare(
    `INSERT INTO rate_limit_windows (name, key, window_start, count) VALUES (?, ?, ?, 1)
     ON CONFLICT (name, key, window_start) DO UPDATE SET count = count + 1
     RETURNING count`,
  );
  const get = db.prepare(`SELECT count FROM rate_limit_windows WHERE name = ? AND key = ? AND window_start = ?`);
  const prune = db.prepare(`DELETE FROM rate_limit_windows WHERE name = ? AND window_start < ?`);
  return {
    increment(key, windowStart) {
      return (inc.get(options.name, key, windowStart) as { count: number }).count;
    },
    get(key, windowStart) {
      return (get.get(options.name, key, windowStart) as { count: number } | undefined)?.count ?? 0;
    },
    prune(before) {
      prune.run(options.name, before);
    },
  };
}
