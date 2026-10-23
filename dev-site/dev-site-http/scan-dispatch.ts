import { Worker } from "node:worker_threads";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import type { DbKey } from "@saflib/drizzle";
import { GitCommandError } from "@saflib/git";
import type { ReturnsError } from "@saflib/utils";
import { makeSubsystemReporters } from "@saflib/node";
import { devSiteDb } from "@saflib/dev-site-db/instances";
import {
  scanCommits,
  type ScanOptions,
  type ScanResult,
  type ScanError,
} from "./scan.ts";
import type { ScanWorkerData, ScanWorkerMessage } from "./scan-worker.ts";
import type { ScanProgress, ScanProgressListener } from "./scan-progress.ts";

const workerUrl = new URL("./scan-worker.ts", import.meta.url);

/** Default batch size for HTTP-triggered scans — one commit keeps the UI snappy. */
export const DEFAULT_HTTP_SCAN_LIMIT = 1;

/** Finished jobs kept for `GET /api/scan/jobs`, newest first. */
const MAX_FINISHED_JOBS = 20;

export type ScanJobStatus = "queued" | "running" | "complete" | "failed";

export interface ScanJob {
  id: string;
  status: ScanJobStatus;
  /** The one commit requested, when the scan targets a single commit. */
  commit_hash?: string;
  /** Max new mainline commits, for history scans. */
  limit?: number;
  created_at: string;
  started_at?: string;
  finished_at?: string;
  /** Latest progress while running. */
  progress?: ScanProgress;
  /** Set when complete. */
  result?: ScanResult;
  /** Set when failed: a git error, or the first commit that failed analysis. */
  error?: string;
}

export interface EnqueueScanOptions extends Omit<ScanOptions, "onProgress"> {
  /**
   * On-disk sqlite path. When omitted, resolved from `dbKey` via the db manager.
   * In-memory DBs always run in-process (workers cannot share `:memory:`).
   */
  dbPath?: string;
}

interface ScanQueue {
  jobs: ScanJob[];
  options: Map<string, EnqueueScanOptions>;
  done: Map<string, Promise<ScanJob>>;
  resolvers: Map<string, (job: ScanJob) => void>;
  running: boolean;
}

/**
 * Scans run as background jobs, one at a time per database: callers enqueue
 * and poll {@link listScanJobs} for progress instead of holding a request open.
 * The queue lives in memory; a restart drops queued jobs (the next scan just
 * picks up what's still unanalyzed).
 */
const queues = new Map<DbKey, ScanQueue>();

function queueFor(dbKey: DbKey): ScanQueue {
  let queue = queues.get(dbKey);
  if (!queue) {
    queue = {
      jobs: [],
      options: new Map(),
      done: new Map(),
      resolvers: new Map(),
      running: false,
    };
    queues.set(dbKey, queue);
  }
  return queue;
}

function isActive(job: ScanJob): boolean {
  return job.status === "queued" || job.status === "running";
}

/**
 * Queue a scan. A request matching a job that is already queued or running
 * (same commit, or same history limit) returns that job instead of a duplicate.
 */
export function enqueueScan(
  dbKey: DbKey,
  options: EnqueueScanOptions,
): ScanJob {
  const queue = queueFor(dbKey);
  const limit =
    options.commit_hash !== undefined
      ? undefined
      : (options.limit ?? DEFAULT_HTTP_SCAN_LIMIT);
  const existing = queue.jobs.find(
    (job) =>
      isActive(job) &&
      job.commit_hash === options.commit_hash &&
      job.limit === limit,
  );
  if (existing) return existing;

  const job: ScanJob = {
    id: randomUUID(),
    status: "queued",
    ...(options.commit_hash !== undefined
      ? { commit_hash: options.commit_hash }
      : {}),
    ...(limit !== undefined ? { limit } : {}),
    created_at: new Date().toISOString(),
  };
  queue.jobs.unshift(job);
  queue.options.set(job.id, { ...options, limit });
  queue.done.set(
    job.id,
    new Promise((resolve) => queue.resolvers.set(job.id, resolve)),
  );
  void drain(dbKey, queue);
  return job;
}

/** Active jobs plus recently finished ones, newest first. */
export function listScanJobs(dbKey: DbKey): ScanJob[] {
  return [...queueFor(dbKey).jobs];
}

/** Resolves when the job finishes (complete or failed). For tests and the CLI. */
export function waitForScanJob(dbKey: DbKey, id: string): Promise<ScanJob> {
  const queue = queueFor(dbKey);
  const job = queue.jobs.find((j) => j.id === id);
  if (job && !isActive(job)) return Promise.resolve(job);
  const done = queue.done.get(id);
  if (!done) return Promise.reject(new Error(`Unknown scan job ${id}`));
  return done;
}

async function drain(dbKey: DbKey, queue: ScanQueue): Promise<void> {
  if (queue.running) return;
  queue.running = true;
  try {
    for (;;) {
      const job = [...queue.jobs].reverse().find((j) => j.status === "queued");
      if (!job) break;
      await runJob(dbKey, queue, job);
    }
  } finally {
    queue.running = false;
  }
}

async function runJob(
  dbKey: DbKey,
  queue: ScanQueue,
  job: ScanJob,
): Promise<void> {
  const options = queue.options.get(job.id)!;
  job.status = "running";
  job.started_at = new Date().toISOString();
  try {
    const { result, error } = await runScan(dbKey, options, (progress) => {
      job.progress = progress;
    });
    if (error) {
      job.status = "failed";
      job.error = error.message;
    } else if (result.failed.length > 0) {
      const first = result.failed[0]!;
      job.status = "failed";
      job.result = result;
      job.error =
        result.failed.length === 1
          ? `${first.hash.slice(0, 10)}: ${first.message}`
          : `${result.failed.length} commits (first ${first.hash.slice(0, 10)}: ${first.message})`;
    } else {
      job.status = "complete";
      job.result = result;
    }
  } catch (err) {
    job.status = "failed";
    job.error = err instanceof Error ? err.message : String(err);
  }
  job.finished_at = new Date().toISOString();
  queue.options.delete(job.id);
  queue.resolvers.get(job.id)?.(job);
  queue.resolvers.delete(job.id);
  queue.done.delete(job.id);
  pruneFinished(queue);
}

function pruneFinished(queue: ScanQueue): void {
  let finished = 0;
  queue.jobs = queue.jobs.filter((job) => {
    if (isActive(job)) return true;
    finished += 1;
    return finished <= MAX_FINISHED_JOBS;
  });
}

/**
 * Run {@link scanCommits} off the Express event loop when the DB is on disk.
 * Falls back to in-process for `:memory:` (unit tests).
 */
async function runScan(
  dbKey: DbKey,
  options: EnqueueScanOptions,
  onProgress: ScanProgressListener,
): Promise<ReturnsError<ScanResult, ScanError>> {
  const dbPath = options.dbPath ?? devSiteDb.getDbPath(dbKey);
  const { log } = makeSubsystemReporters("http", "scan");

  if (!dbPath || dbPath === ":memory:") {
    log.info("Running scan in-process (:memory: db)");
    return scanCommits(dbKey, { ...options, onProgress });
  }

  log.info(
    options.commit_hash
      ? `Dispatching scan worker for commit ${options.commit_hash.slice(0, 10)}`
      : `Dispatching scan worker (limit=${options.limit ?? "none"})`,
  );
  return scanCommitsInWorker(
    {
      dbPath,
      repo_root: options.repo_root,
      product_root: options.product_root,
      mainRef: options.mainRef,
      limit: options.commit_hash ? undefined : options.limit,
      commit_hash: options.commit_hash,
    },
    onProgress,
  );
}

export function scanCommitsInWorker(
  data: ScanWorkerData,
  onProgress?: ScanProgressListener,
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
      if (msg.type === "progress") {
        onProgress?.(msg.progress);
        return;
      }

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
  return (
    type === "progress" ||
    type === "ok" ||
    type === "git-error" ||
    type === "error"
  );
}
