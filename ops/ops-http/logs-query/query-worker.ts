// Runs one read-only query in a worker thread so the caller can kill it on a
// timeout (better-sqlite3 can't interrupt a running statement). Replies are
// tagged `logsQuery`: under `node --watch`, Node posts its own messages
// (loaded modules) on the same port.
import { parentPort, workerData } from "node:worker_threads";
import Database from "better-sqlite3";

const { path, sql, maxRows } = workerData as { path: string; sql: string; maxRows: number };

function cell(v: unknown): unknown {
  if (Buffer.isBuffer(v)) return `[blob ${v.length} bytes]`;
  if (typeof v === "bigint") return v.toString();
  return v;
}

try {
  // Read-only connection, query_only on top, to this one file. Extensions
  // stay off (better-sqlite3's default).
  const db = new Database(path, { readonly: true, fileMustExist: true });
  db.pragma("query_only = ON");
  // prepare() rejects more than one statement.
  const stmt = db.prepare(sql);
  // readonly: no writes. reader: returns rows (rules out ATTACH, most PRAGMA
  // setters and other statements that only change the connection).
  if (!stmt.readonly || !stmt.reader) {
    throw new Error("Only a single read-only query that returns rows is allowed");
  }
  const columns = stmt.columns().map((c) => c.name);
  stmt.raw(true);
  const rows: unknown[][] = [];
  let truncated = false;
  for (const r of stmt.iterate() as Iterable<unknown[]>) {
    if (rows.length >= maxRows) {
      truncated = true;
      break;
    }
    rows.push(r.map(cell));
  }
  db.close();
  parentPort!.postMessage({ logsQuery: true, ok: true, columns, rows, truncated });
} catch (e) {
  parentPort!.postMessage({ logsQuery: true, ok: false, message: e instanceof Error ? e.message : String(e) });
}
