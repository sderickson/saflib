import {
  isAncestor,
  listRefs,
  log,
  type GitCommit,
  GitCommandError,
} from "@saflib/git";
import type { DbKey } from "@saflib/drizzle";
import type { ReturnsError } from "@saflib/monorepo";
import { analyzedCommitsDb } from "@saflib/dev-site-db/queries/analyzed-commits/index";
import { packageMetricsDb } from "@saflib/dev-site-db/queries/package-metrics/index";
import { exportsDb } from "@saflib/dev-site-db/queries/exports/index";
import { testCasesDb } from "@saflib/dev-site-db/queries/test-cases/index";
import { analyzeCommit, ANALYZER_VERSION } from "./analyze-commit.ts";

export interface ScanOptions {
  repoRoot: string;
  /** Limit analysis to this path prefix (e.g. `daemon`). */
  productRoot?: string;
  /** Main branch ref. Defaults to `main`. */
  mainRef?: string;
  /**
   * Max new commits to analyze in this run. Mainline is walked newest-first
   * (tip of `mainRef` first), skipping commits already in the DB, so repeated
   * limited scans fill history backward from HEAD.
   */
  limit?: number;
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

/**
 * Ingest mainline commits newest-first (tip first), plus divergent feature-branch
 * tips when `limit` is unset.
 */
export async function scanCommits(
  dbKey: DbKey,
  options: ScanOptions,
): Promise<ReturnsError<ScanResult, ScanError>> {
  const mainRef = options.mainRef ?? "main";
  const scanned: string[] = [];
  const skipped: string[] = [];
  const failed: ScanFailure[] = [];

  const logResult = log(options.repoRoot, { ref: mainRef });
  if (logResult.error) {
    // Empty repo / missing main — treat as no mainline commits rather than hard fail
    // when the ref simply doesn't exist yet.
    if (logResult.error.exitCode === 128) {
      // fall through with no mainline commits
    } else {
      return { error: logResult.error };
    }
  }
  // git log is newest-first; keep that order so limited scans start at tip.
  const mainline: GitCommit[] = logResult.result ?? [];

  const refsResult = listRefs(options.repoRoot);
  if (refsResult.error) return { error: refsResult.error };

  const toAnalyze: GitCommit[] = [];
  for (const commit of mainline) {
    const existing = await analyzedCommitsDb.getByHash(dbKey, commit.hash);
    if (existing.result) {
      skipped.push(commit.hash);
      continue;
    }
    toAnalyze.push(commit);
    if (options.limit !== undefined && options.limit >= 0) {
      if (toAnalyze.length >= options.limit) break;
    }
  }

  // When `--limit` is set (CLI/dev convenience), skip feature-branch tip discovery
  // so the run stays bounded to mainline commits only.
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
      if (ancestor.result) continue; // already on main history

      const tipLog = log(options.repoRoot, { ref: ref.hash, limit: 1 });
      if (tipLog.error) {
        failed.push({ hash: ref.hash, message: tipLog.error.message });
        continue;
      }
      const tip = tipLog.result[0];
      if (!tip) continue;

      const existing = await analyzedCommitsDb.getByHash(dbKey, tip.hash);
      if (existing.result) {
        skipped.push(tip.hash);
        continue;
      }
      toAnalyze.push(tip);
      scheduled.add(tip.hash);
    }
  }

  for (const commit of toAnalyze) {
    const analyzed = analyzeCommit(commit, {
      repoRoot: options.repoRoot,
      productRoot: options.productRoot,
      mainRef,
    });
    if (analyzed.error) {
      failed.push({ hash: commit.hash, message: analyzed.error.message });
      continue;
    }
    const snap = analyzed.result;

    await analyzedCommitsDb.insert(dbKey, {
      hash: commit.hash,
      parentHashes: snap.parentHashes,
      authoredAt: snap.authoredAt,
      message: snap.message,
      refs: snap.refs,
      analyzerVersion: snap.analyzerVersion || ANALYZER_VERSION,
      computedAt: new Date(),
      status: "complete",
    });

    await packageMetricsDb.insertMany(
      dbKey,
      snap.packageMetrics.map((m) => ({ ...m, commitHash: commit.hash })),
    );

    await exportsDb.insertMany(
      dbKey,
      snap.exports.map((e) => ({ ...e, commitHash: commit.hash })),
    );

    await testCasesDb.insertMany(
      dbKey,
      snap.testCases.map((t) => ({ ...t, commitHash: commit.hash })),
    );

    scanned.push(commit.hash);
  }

  return { result: { scanned, skipped, failed } };
}
