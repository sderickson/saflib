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
    worker.on("message", (m: unknown) => {
      const msg = (m ?? {}) as { logsQuery?: boolean; ok?: boolean; columns?: string[]; rows?: unknown[][]; truncated?: boolean; message?: unknown };
      // Ignore anything that isn't the worker's reply (e.g. --watch's module reports).
      if (msg.logsQuery !== true) return;
      finish(() => {
        if (msg.ok && Array.isArray(msg.columns) && Array.isArray(msg.rows)) {
          resolve({ columns: msg.columns, rows: msg.rows, truncated: !!msg.truncated, duration_ms: Date.now() - started });
        } else {
          reject(createError(400, typeof msg.message === "string" && msg.message ? msg.message : "Query failed"));
        }
      });
      void worker.terminate();
    });
    // Never let a worker failure escape as an uncaught exception.
    worker.once("error", (e) => finish(() => reject(createError(500, `Query worker failed: ${e instanceof Error ? e.message : String(e)}`))));
    worker.once("exit", (code) => finish(() => reject(createError(500, `Query worker exited (${code})`))));
  });
}
