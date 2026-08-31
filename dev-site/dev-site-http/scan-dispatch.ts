import { Worker } from "node:worker_threads";
import { fileURLToPath } from "node:url";
import type { DbKey } from "@saflib/drizzle";
import { GitCommandError } from "@saflib/git";
import type { ReturnsError } from "@saflib/monorepo";
import { makeSubsystemReporters } from "@saflib/node";
import { devSiteDb } from "@saflib/dev-site-db/instances";
import {
  scanCommits,
  type ScanOptions,
  type ScanResult,
  type ScanError,
} from "./scan.ts";
import type { ScanWorkerData, ScanWorkerMessage } from "./scan-worker.ts";

const workerUrl = new URL("./scan-worker.ts", import.meta.url);

/** Default batch size for HTTP-triggered scans — one commit keeps the UI snappy. */
export const DEFAULT_HTTP_SCAN_LIMIT = 1;

export interface DispatchScanOptions extends ScanOptions {
  /**
   * On-disk sqlite path. When omitted, resolved from `dbKey` via the db manager.
   * In-memory DBs always run in-process (workers cannot share `:memory:`).
   */
  dbPath?: string;
}

/**
 * Run {@link scanCommits} off the Express event loop when the DB is on disk.
 * Falls back to in-process for `:memory:` (unit tests).
 *
 * Concurrent callers share one in-flight promise so double-clicks don't stack workers.
 */
let inFlight: Promise<ReturnsError<ScanResult, ScanError>> | null = null;

export async function dispatchScan(
  dbKey: DbKey,
  options: DispatchScanOptions,
): Promise<ReturnsError<ScanResult, ScanError>> {
  if (inFlight) {
    return inFlight;
  }
  inFlight = runScan(dbKey, options).finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function runScan(
  dbKey: DbKey,
  options: DispatchScanOptions,
): Promise<ReturnsError<ScanResult, ScanError>> {
  const dbPath = options.dbPath ?? devSiteDb.getDbPath(dbKey);
  const limit =
    options.commit_hash !== undefined
      ? undefined
      : (options.limit ?? DEFAULT_HTTP_SCAN_LIMIT);

  if (!dbPath || dbPath === ":memory:") {
    const { log } = makeSubsystemReporters("http", "scan");
    log.info("Running scan in-process (:memory: db)");
    return scanCommits(dbKey, { ...options, limit });
  }

  const { log } = makeSubsystemReporters("http", "scan");
  log.info(
    options.commit_hash
      ? `Dispatching scan worker for commit ${options.commit_hash.slice(0, 10)}`
      : `Dispatching scan worker (limit=${limit ?? "none"})`,
  );
  return scanCommitsInWorker({
    dbPath,
    repo_root: options.repo_root,
    product_root: options.product_root,
    mainRef: options.mainRef,
    limit: options.commit_hash ? undefined : limit,
    commit_hash: options.commit_hash,
  });
}

export function scanCommitsInWorker(
  data: ScanWorkerData,
): Promise<ReturnsError<ScanResult, ScanError>> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(fileURLToPath(workerUrl), {
      workerData: data,
      // Explicit argv so we do not inherit the API process's `node --watch`.
      execArgv: [
        "--experimental-strip-types",
        "--disable-warning=ExperimentalWarning",
      ],
    });

    let settled = false;
    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      fn();
    };

    worker.on("message", (msg: unknown) => {
      // `node --watch` on the parent can still emit watch IPC (e.g. `watch:import`)
      // on this channel — ignore anything that isn't our scan protocol.
      if (!isScanWorkerMessage(msg)) return;

      settle(() => {
        switch (msg.type) {
          case "ok":
            resolve({ result: msg.result });
            break;
          case "git-error":
            resolve({
              error: new GitCommandError(msg.message, {
                args: msg.args,
                stderr: msg.stderr,
                exitCode: msg.exitCode,
              }),
            });
            break;
          case "error":
            reject(Object.assign(new Error(msg.message), { stack: msg.stack }));
            break;
        }
      });
    });

    worker.on("error", (err) => {
      settle(() => reject(err));
    });

    worker.on("exit", (code) => {
      settle(() => {
        if (code !== 0) {
          reject(new Error(`scan worker exited with code ${code}`));
        } else {
          reject(new Error("scan worker exited without a result message"));
        }
      });
    });
  });
}

function isScanWorkerMessage(msg: unknown): msg is ScanWorkerMessage {
  if (typeof msg !== "object" || msg === null || !("type" in msg)) {
    return false;
  }
  const type = (msg as { type: unknown }).type;
  return type === "ok" || type === "git-error" || type === "error";
}
