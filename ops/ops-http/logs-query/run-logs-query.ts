import { Worker } from "node:worker_threads";
import createError from "http-errors";

export const LOGS_QUERY_MAX_ROWS = 1000;
export const LOGS_QUERY_TIMEOUT_MS = 5000;

export interface LogsQueryResult {
  columns: string[];
  rows: unknown[][];
  truncated: boolean;
  duration_ms: number;
}

/**
 * Run one read-only statement against the SQLite file at `path` in a worker
 * thread, stopped after `timeoutMs`. Throws 400 for rejected SQL and 408 on
 * timeout.
 */
export function runLogsQuery(
  path: string,
  sql: string,
  options: { maxRows?: number; timeoutMs?: number } = {},
): Promise<LogsQueryResult> {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./query-worker.ts", import.meta.url), {
      workerData: { path, sql, maxRows: options.maxRows ?? LOGS_QUERY_MAX_ROWS },
    });
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn();
    };
    const timer = setTimeout(() => {
      finish(() => reject(createError(408, "Query took longer than 5 seconds and was stopped")));
      void worker.terminate();
    }, options.timeoutMs ?? LOGS_QUERY_TIMEOUT_MS);
    worker.once("message", (m: { ok: true; columns: string[]; rows: unknown[][]; truncated: boolean } | { ok: false; message: string }) => {
      finish(() =>
        m.ok
          ? resolve({ columns: m.columns, rows: m.rows, truncated: m.truncated, duration_ms: Date.now() - started })
          : reject(createError(400, m.message)),
      );
      void worker.terminate();
    });
    worker.once("error", (e) => finish(() => reject(e)));
  });
}
