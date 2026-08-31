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
import { computeCommitIssueStats } from "./compute-commit-issue-stats.ts";

import { insert } from "@saflib/dev-site-db/queries/analyzed-commits/insert";
import { getByHash } from "@saflib/dev-site-db/queries/analyzed-commits/get-by-hash";
import { list as listAnalyzedCommits } from "@saflib/dev-site-db/queries/analyzed-commits/list";
import { insertMany } from "@saflib/dev-site-db/queries/package-metrics/insert-many";
import { listByCommit as listPackageMetrics } from "@saflib/dev-site-db/queries/package-metrics/list-by-commit";
import { insertMany as insertIssueStats } from "@saflib/dev-site-db/queries/package-issue-stats/insert-many";
import { deleteByCommit as deleteIssueStats } from "@saflib/dev-site-db/queries/package-issue-stats/delete-by-commit";
import { listByCommit as listIssueStats } from "@saflib/dev-site-db/queries/package-issue-stats/list-by-commit";

export interface ScanOptions {
  repo_root: string;
  /** Limit analysis to this path prefix (e.g. `products`). */
  product_root?: string;
  /** Main branch ref. Defaults to `main`. */
  mainRef?: string;
  /**
   * Max new commits to analyze in this run. Mainline is walked newest-first
   * (tip of `mainRef` first), skipping commits already in the DB, so repeated
   * limited scans fill history backward from HEAD.
   * Ignored when {@link commit_hash} is set.
   */
  limit?: number;
  /**
   * Analyze exactly this commit (if not already stored). Skips history walk
   * and feature-branch tip discovery.
   */
  commit_hash?: string;
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

export interface RecomputeIssueStatsResult {
  recomputed: string[];
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

async function persistIssueStatsForCommit(
  dbKey: DbKey,
  commit_hash: string,
  options: {
    repo_root: string;
    product_root?: string;
    mainRef: string;
    packages?: Array<{ package_name: string; directory: string }>;
  },
): Promise<ReturnsError<void, GitCommandError>> {
  const stats = await computeCommitIssueStats(dbKey, commit_hash, {
    repo_root: options.repo_root,
    product_root: options.product_root,
    mainRef: options.mainRef,
    packages: options.packages,
  });
  if (stats.error) return { error: stats.error };

  await deleteIssueStats(dbKey, commit_hash);
  const rows =
    stats.result.length > 0
      ? stats.result.map((row) => ({ ...row, commit_hash }))
      : [
          {
            commit_hash,
            // Sentinel so list APIs can tell "computed, zero issues" from "never computed".
            package_name: "__meta__",
            kind: "dead-code" as const,
            count: 0,
          },
        ];
  await insertIssueStats(dbKey, rows);
  return { result: undefined };
}

async function persistCommit(
  dbKey: DbKey,
  commit: GitCommit,
  options: {
    repo_root: string;
    product_root?: string;
    mainRef: string;
  },
): Promise<ReturnsError<void, GitCommandError>> {
  const analyzed = await analyzeCommit(dbKey, commit, {
    repo_root: options.repo_root,
    product_root: options.product_root,
    mainRef: options.mainRef,
  });
  if (analyzed.error) {
    return { error: analyzed.error };
  }
  const snap = analyzed.result;

  await insert(dbKey, {
    hash: commit.hash,
    parent_hashes: snap.parent_hashes,
    authored_at: snap.authored_at,
    message: snap.message,
    refs: snap.refs,
    analyzer_version: snap.analyzer_version || ANALYZER_VERSION,
    computed_at: new Date(),
    status: "complete",
    export_count: snap.export_count,
    test_case_count: snap.test_case_count,
  });

  await insertMany(
    dbKey,
    snap.package_metrics.map((m) => ({ ...m, commit_hash: commit.hash })),
  );

  const issuePersist = await persistIssueStatsForCommit(dbKey, commit.hash, {
    repo_root: options.repo_root,
    product_root: options.product_root,
    mainRef: options.mainRef,
    packages: snap.package_metrics.map((m) => ({
      package_name: m.package_name,
      directory: m.directory,
    })),
  });
  if (issuePersist.error) return { error: issuePersist.error };

  return { result: undefined };
}

async function analyzeAndPersist(
  dbKey: DbKey,
  commit: GitCommit,
  options: {
    repo_root: string;
    product_root?: string;
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
 * tips when `limit` is unset. Or analyze a single {@link ScanOptions.commit_hash}.
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

  if (options.commit_hash) {
    scanLog.info(
      `Scan start: single commit ${shortHash(options.commit_hash)} (product_root=${options.product_root ?? ""})`,
    );
    const existing = await getByHash(
      dbKey,
      options.commit_hash,
    );
    if (existing.result) {
      scanLog.info(
        `Scan skip: ${shortHash(options.commit_hash)} already analyzed`,
      );
      return {
        result: {
          scanned: [],
          skipped: [options.commit_hash],
          failed: [],
        },
      };
    }

    const tipLog = log(options.repo_root, {
      ref: options.commit_hash,
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
              hash: options.commit_hash,
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
        repo_root: options.repo_root,
        product_root: options.product_root,
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
      ` product_root=${options.product_root ?? ""}`,
  );

  const logResult = log(options.repo_root, { ref: mainRef });
  if (logResult.error) {
    if (logResult.error.exitCode === 128) {
      // fall through
    } else {
      return { error: logResult.error };
    }
  }
  const mainline: GitCommit[] = logResult.result ?? [];

  const refsResult = listRefs(options.repo_root);
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

      const ancestor = isAncestor(options.repo_root, ref.hash, mainRef);
      if (ancestor.error && ancestor.error.exitCode !== 128) {
        return { error: ancestor.error };
      }
      if (ancestor.result) continue;

      const tipLog = log(options.repo_root, { ref: ref.hash, limit: 1 });
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
        repo_root: options.repo_root,
        product_root: options.product_root,
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

/**
 * Recompute `package_issue_stats` for already-analyzed commits (backfill / analyzer bumps).
 * Skips commits that already have issue rows unless `force` is set.
 */
export async function recomputeIssueStats(
  dbKey: DbKey,
  options: {
    repo_root: string;
    product_root?: string;
    mainRef?: string;
    /** Only this commit (must already be analyzed). */
    commit_hash?: string;
    /** Max commits to recompute this run (newest first). */
    limit?: number;
    /** Replace existing issue stats even when present. */
    force?: boolean;
  },
): Promise<ReturnsError<RecomputeIssueStatsResult, ScanError>> {
  const { log: scanLog } = makeSubsystemReporters("http", "scan");
  const mainRef = options.mainRef ?? "main";
  const recomputed: string[] = [];
  const skipped: string[] = [];
  const failed: ScanFailure[] = [];
  const runStarted = Date.now();

  const targets: string[] = [];
  if (options.commit_hash) {
    const existing = await getByHash(dbKey, options.commit_hash);
    if (!existing.result) {
      return {
        result: {
          recomputed: [],
          skipped: [],
          failed: [
            {
              hash: options.commit_hash,
              message: "Commit not analyzed yet — run scan first",
            },
          ],
        },
      };
    }
    targets.push(options.commit_hash);
  } else {
    let cursor: string | undefined;
    const limit = options.limit ?? 50;
    while (targets.length < limit) {
      const page = await listAnalyzedCommits(dbKey, {
        cursor,
        limit: Math.min(50, limit - targets.length),
      });
      if (page.error) {
        return {
          result: {
            recomputed,
            skipped,
            failed: [
              ...failed,
              { hash: cursor ?? "", message: page.error.message },
            ],
          },
        };
      }
      for (const c of page.result.commits) {
        targets.push(c.hash);
        if (targets.length >= limit) break;
      }
      if (!page.result.next_cursor || page.result.commits.length === 0) break;
      cursor = page.result.next_cursor;
    }
  }

  scanLog.info(
    `Recompute issue stats: ${targets.length} commit(s)` +
      (options.force ? " (force)" : " (skip if present)") +
      ` product_root=${options.product_root ?? ""}`,
  );

  for (let i = 0; i < targets.length; i++) {
    const hash = targets[i]!;
    const label = `${i + 1}/${targets.length} ${shortHash(hash)}`;
    if (!options.force) {
      const existingStats = await listIssueStats(dbKey, hash);
      if ((existingStats.result?.length ?? 0) > 0) {
        skipped.push(hash);
        scanLog.info(`Skip ${label} — issue stats already present`);
        continue;
      }
    }

    const metrics = (await listPackageMetrics(dbKey, hash)).result ?? [];
    scanLog.info(`Recomputing ${label}`);
    const started = Date.now();
    const outcome = await persistIssueStatsForCommit(dbKey, hash, {
      repo_root: options.repo_root,
      product_root: options.product_root,
      mainRef,
      packages: metrics.map((m) => ({
        package_name: m.package_name,
        directory: m.directory,
      })),
    });
    const ms = Date.now() - started;
    if (outcome.error) {
      failed.push({ hash, message: outcome.error.message });
      scanLog.warn(`Failed ${label} after ${ms}ms: ${outcome.error.message}`);
      continue;
    }
    recomputed.push(hash);
    scanLog.info(`Done ${label} in ${ms}ms`);
  }

  scanLog.info(
    `Recompute finished in ${Date.now() - runStarted}ms: recomputed=${recomputed.length} skipped=${skipped.length} failed=${failed.length}`,
  );
  return { result: { recomputed, skipped, failed } };
}
