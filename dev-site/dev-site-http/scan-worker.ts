/**
 * Worker-thread entry for {@link scanCommits}.
 * Opens its own SQLite connection so the main Express process stays responsive.
 */
import { workerData, parentPort } from "node:worker_threads";
import { setServiceName } from "@saflib/node";
import { GitCommandError } from "@saflib/git";
import { devSiteDb } from "@saflib/dev-site-db/instances";
import { scanCommits, type ScanOptions, type ScanResult } from "./scan.ts";

export interface ScanWorkerData extends ScanOptions {
  dbPath: string;
}

export type ScanWorkerMessage =
  | { type: "ok"; result: ScanResult }
  | {
      type: "git-error";
      message: string;
      args: string[];
      stderr: string;
      exitCode: number | null;
    }
  | { type: "error"; message: string; stack?: string };

async function main(): Promise<void> {
  if (!parentPort) {
    throw new Error("scan-worker must run as a worker thread");
  }
  // DbManager logging uses @saflib/node reporters, which require a service name.
  setServiceName("dev-site-scan-worker");

  const data = workerData as ScanWorkerData;
  const dbKey = devSiteDb.connect({
    onDisk: data.dbPath,
    skipMigrations: true,
    overrideTestDefault: true,
    pragmas: {
      journal_mode: "WAL",
      busy_timeout: 5000,
    },
  });
  try {
    const { result, error } = await scanCommits(dbKey, {
      repo_root: data.repo_root,
      product_root: data.product_root,
      mainRef: data.mainRef,
      limit: data.limit,
      commit_hash: data.commit_hash,
    });
    if (error) {
      const msg: ScanWorkerMessage = {
        type: "git-error",
        message: error.message,
        args: [...error.args],
        stderr: error.stderr,
        exitCode: error.exitCode,
      };
      parentPort.postMessage(msg);
      return;
    }
    parentPort.postMessage({ type: "ok", result } satisfies ScanWorkerMessage);
  } finally {
    devSiteDb.disconnect(dbKey);
  }
}

main().catch((err: unknown) => {
  const error = err instanceof Error ? err : new Error(String(err));
  const msg: ScanWorkerMessage = {
    type: "error",
    message: error.message,
    stack: error.stack,
  };
  parentPort?.postMessage(msg);
  // Ensure non-zero exit so the host notices if postMessage races exit.
  if (!(err instanceof GitCommandError)) {
    process.exitCode = 1;
  }
});
