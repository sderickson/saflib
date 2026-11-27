import { describe, it, expect, beforeAll } from "vitest";
import Database from "better-sqlite3";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runLogsQuery } from "./run-logs-query.ts";

let path: string;
let otherPath: string;

beforeAll(() => {
  const dir = mkdtempSync(join(tmpdir(), "logsq-"));
  path = join(dir, "logs.sqlite");
  otherPath = join(dir, "app.sqlite");
  const db = new Database(path);
  db.exec(`CREATE TABLE log_entries (id INTEGER PRIMARY KEY, ts INTEGER, event TEXT, fields TEXT)`);
  const ins = db.prepare(`INSERT INTO log_entries (ts, event, fields) VALUES (?, ?, ?)`);
  for (let i = 0; i < 1500; i++) ins.run(i, i % 2 ? "a.b" : null, JSON.stringify({ n: i }));
  db.close();
  new Database(otherPath).exec(`CREATE TABLE secrets (s TEXT); INSERT INTO secrets VALUES ('x')`);
});

describe("runLogsQuery", () => {
  it("returns columns and rows, capped and flagged as truncated", async () => {
    const r = await runLogsQuery(path, "SELECT event, count(*) AS n FROM log_entries GROUP BY event ORDER BY event");
    expect(r.columns).toEqual(["event", "n"]);
    expect(r.rows).toEqual([[null, 750], ["a.b", 750]]);
    expect(r.truncated).toBe(false);
    const all = await runLogsQuery(path, "SELECT json_extract(fields, '$.n') FROM log_entries", { maxRows: 1000 });
    expect(all.rows).toHaveLength(1000);
    expect(all.truncated).toBe(true);
  });

  it("rejects writes, several statements, ATTACH and pragma setters", async () => {
    for (const sql of [
      "DELETE FROM log_entries",
      "UPDATE log_entries SET event = 'x'",
      "SELECT 1; DELETE FROM log_entries",
      `ATTACH DATABASE '${otherPath}' AS app`,
      "PRAGMA query_only = OFF",
      "CREATE TABLE t (x)",
    ]) {
      await expect(runLogsQuery(path, sql), sql).rejects.toMatchObject({ status: 400 });
    }
    const still = await runLogsQuery(path, "SELECT count(*) FROM log_entries");
    expect(still.rows).toEqual([[1500]]);
  });

  it("stops a query that runs too long", async () => {
    const slow = `WITH RECURSIVE c(x) AS (SELECT 1 UNION ALL SELECT x + 1 FROM c) SELECT count(*) FROM c`;
    await expect(runLogsQuery(path, slow, { timeoutMs: 300 })).rejects.toMatchObject({ status: 408 });
  });
});
