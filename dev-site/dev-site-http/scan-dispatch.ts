import { Worker } from "node:worker_threads";
import { fileURLToPath } from "node:url";
import type { DbKey } from "@saflib/drizzle";
import { GitCommandError } from "@saflib/git";
import type { ReturnsError } from "@saflib/monorepo";
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
  const limit = options.limit ?? DEFAULT_HTTP_SCAN_LIMIT;
  const dbPath = options.dbPath ?? devSiteDb.getDbPath(dbKey);

  if (!dbPath || dbPath === ":memory:") {
    return scanCommits(dbKey, { ...options, limit });
  }

  return scanCommitsInWorker({
    dbPath,
    repoRoot: options.repoRoot,
    productRoot: options.productRoot,
    mainRef: options.mainRef,
    limit,
  });
}

export function scanCommitsInWorker(
  data: ScanWorkerData,
): Promise<ReturnsError<ScanResult, ScanError>> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(fileURLToPath(workerUrl), {
      workerData: data,
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

    worker.on("message", (msg: ScanWorkerMessage) => {
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
          default:
            reject(new Error(`Unknown scan worker message: ${JSON.stringify(msg)}`));
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
