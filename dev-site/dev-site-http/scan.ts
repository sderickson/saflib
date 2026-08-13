import {
  isAncestor,
  listRefs,
  log,
  type GitCommit,
  GitCommandError,
} from "@saflib/git";
import type { DbKey } from "@saflib/drizzle";
import type { ReturnsError } from "@saflib/monorepo";
import { makeSubsystemReporters } from "@saflib/node";

import { analyzeCommit, ANALYZER_VERSION } from "./analyze-commit.ts";

import { insert } from "@saflib/dev-site-db/queries/analyzed-commits/insert";
import { getByHash } from "@saflib/dev-site-db/queries/analyzed-commits/get-by-hash";
import { insertMany } from "@saflib/dev-site-db/queries/package-metrics/insert-many";
export interface ScanOptions {
  repoRoot: string;
  /** Limit analysis to this path prefix (e.g. `products`). */
  productRoot?: string;
  /** Main branch ref. Defaults to `main`. */
  mainRef?: string;
  /**
   * Max new commits to analyze in this run. Mainline is walked newest-first
   * (tip of `mainRef` first), skipping commits already in the DB, so repeated
   * limited scans fill history backward from HEAD.
   * Ignored when {@link commitHash} is set.
   */
  limit?: number;
  /**
   * Analyze exactly this commit (if not already stored). Skips history walk
   * and feature-branch tip discovery.
   */
  commitHash?: string;
}

export interface ScanFailure {
  hash: string;
  message: string;
}

export interface ScanResult {
  scanned: string[];
  skipped: string[];
  failed: ScanFailure[];
}

export type ScanError = GitCommandError;

function shortHash(hash: string): string {
  return hash.slice(0, 10);
}

function firstLine(message: string): string {
  return message.split("\n")[0] ?? message;
}

async function persistCommit(
  dbKey: DbKey,
  commit: GitCommit,
  options: {
    repoRoot: string;
    productRoot?: string;
    mainRef: string;
  },
): Promise<ReturnsError<void, GitCommandError>> {
  const analyzed = await analyzeCommit(dbKey, commit, {
    repoRoot: options.repoRoot,
    productRoot: options.productRoot,
    mainRef: options.mainRef,
  });
  if (analyzed.error) {
    return { error: analyzed.error };
  }
  const snap = analyzed.result;

  await insert(dbKey, {
    hash: commit.hash,
    parentHashes: snap.parentHashes,
    authoredAt: snap.authoredAt,
    message: snap.message,
    refs: snap.refs,
    analyzerVersion: snap.analyzerVersion || ANALYZER_VERSION,
    computedAt: new Date(),
    status: "complete",
    exportCount: snap.exportCount,
    testCaseCount: snap.testCaseCount,
  });

  await insertMany(
    dbKey,
    snap.packageMetrics.map((m) => ({ ...m, commitHash: commit.hash })),
  );

  return { result: undefined };
}

async function analyzeAndPersist(
  dbKey: DbKey,
  commit: GitCommit,
  options: {
    repoRoot: string;
    productRoot?: string;
    mainRef: string;
  },
  progress: { index: number; total: number },
): Promise<ReturnsError<"scanned" | "failed", GitCommandError>> {
  const { log: scanLog } = makeSubsystemReporters("http", "scan");
  const label = `${progress.index}/${progress.total} ${shortHash(commit.hash)}`;
  scanLog.info(
    `Analyzing ${label} — ${firstLine(commit.subject || commit.hash)}`,
  );
  const started = Date.now();
  const persisted = await persistCommit(dbKey, commit, options);
  const ms = Date.now() - started;
  if (persisted.error) {
    scanLog.warn(
      `Failed ${label} after ${ms}ms: ${persisted.error.message}`,
    );
    return { error: persisted.error };
  }
  scanLog.info(`Done ${label} in ${ms}ms`);
  return { result: "scanned" };
}

/**
 * Ingest mainline commits newest-first (tip first), plus divergent feature-branch
 * tips when `limit` is unset. Or analyze a single {@link ScanOptions.commitHash}.
 */
export async function scanCommits(
  dbKey: DbKey,
  options: ScanOptions,
): Promise<ReturnsError<ScanResult, ScanError>> {
  const { log: scanLog } = makeSubsystemReporters("http", "scan");
  const mainRef = options.mainRef ?? "main";
  const scanned: string[] = [];
  const skipped: string[] = [];
  const failed: ScanFailure[] = [];
  const runStarted = Date.now();

  if (options.commitHash) {
    scanLog.info(
      `Scan start: single commit ${shortHash(options.commitHash)} (productRoot=${options.productRoot ?? ""})`,
    );
    const existing = await getByHash(
      dbKey,
      options.commitHash,
    );
    if (existing.result) {
      scanLog.info(
        `Scan skip: ${shortHash(options.commitHash)} already analyzed`,
      );
      return {
        result: {
          scanned: [],
          skipped: [options.commitHash],
          failed: [],
        },
      };
    }

    const tipLog = log(options.repoRoot, {
      ref: options.commitHash,
      limit: 1,
    });
    if (tipLog.error) return { error: tipLog.error };
    const commit = tipLog.result[0];
    if (!commit) {
      return {
        result: {
          scanned: [],
          skipped: [],
          failed: [
            {
              hash: options.commitHash,
              message: "No commit found for hash",
            },
          ],
        },
      };
    }

    const outcome = await analyzeAndPersist(
      dbKey,
      commit,
      {
        repoRoot: options.repoRoot,
        productRoot: options.productRoot,
        mainRef,
      },
      { index: 1, total: 1 },
    );
    if (outcome.error) {
      failed.push({ hash: commit.hash, message: outcome.error.message });
    } else {
      scanned.push(commit.hash);
    }
    scanLog.info(
      `Scan finished in ${Date.now() - runStarted}ms: scanned=${scanned.length} skipped=${skipped.length} failed=${failed.length}`,
    );
    return { result: { scanned, skipped, failed } };
  }

  scanLog.info(
    `Scan start: mainline ${mainRef} newest-first` +
      (options.limit !== undefined ? ` limit=${options.limit}` : " (no limit)") +
      ` productRoot=${options.productRoot ?? ""}`,
  );

  const logResult = log(options.repoRoot, { ref: mainRef });
  if (logResult.error) {
    if (logResult.error.exitCode === 128) {
      // fall through
    } else {
      return { error: logResult.error };
    }
  }
  const mainline: GitCommit[] = logResult.result ?? [];

  const refsResult = listRefs(options.repoRoot);
  if (refsResult.error) return { error: refsResult.error };

  const toAnalyze: GitCommit[] = [];
  for (const commit of mainline) {
    const existing = await getByHash(dbKey, commit.hash);
    if (existing.result) {
      skipped.push(commit.hash);
      continue;
    }
    toAnalyze.push(commit);
    if (options.limit !== undefined && options.limit >= 0) {
      if (toAnalyze.length >= options.limit) break;
    }
  }

  if (options.limit === undefined) {
    const scheduled = new Set(toAnalyze.map((c) => c.hash));
    for (const h of skipped) scheduled.add(h);

    for (const ref of refsResult.result) {
      if (ref.type !== "branch") continue;
      if (ref.name === mainRef) continue;
      if (scheduled.has(ref.hash)) continue;

      const ancestor = isAncestor(options.repoRoot, ref.hash, mainRef);
      if (ancestor.error && ancestor.error.exitCode !== 128) {
        return { error: ancestor.error };
      }
      if (ancestor.result) continue;

      const tipLog = log(options.repoRoot, { ref: ref.hash, limit: 1 });
      if (tipLog.error) {
        failed.push({ hash: ref.hash, message: tipLog.error.message });
        continue;
      }
      const tip = tipLog.result[0];
      if (!tip) continue;

      const existing = await getByHash(dbKey, tip.hash);
      if (existing.result) {
        skipped.push(tip.hash);
        continue;
      }
      toAnalyze.push(tip);
      scheduled.add(tip.hash);
    }
  }

  scanLog.info(
    `Plan: ${toAnalyze.length} to analyze, ${skipped.length} already stored` +
      (mainline.length ? ` (mainline has ${mainline.length} commits)` : ""),
  );

  for (let i = 0; i < toAnalyze.length; i++) {
    const commit = toAnalyze[i]!;
    const outcome = await analyzeAndPersist(
      dbKey,
      commit,
      {
        repoRoot: options.repoRoot,
        productRoot: options.productRoot,
        mainRef,
      },
      { index: i + 1, total: toAnalyze.length },
    );
    if (outcome.error) {
      failed.push({ hash: commit.hash, message: outcome.error.message });
      continue;
    }
    scanned.push(commit.hash);
  }

  scanLog.info(
    `Scan finished in ${Date.now() - runStarted}ms: scanned=${scanned.length} skipped=${skipped.length} failed=${failed.length}`,
  );
  return { result: { scanned, skipped, failed } };
}
