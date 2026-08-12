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
  /** Max new commits to analyze in this run (after applying the since cursor). */
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
 * Ingest new commits since the last recorded one, plus divergent feature-branch tips.
 */
export async function scanCommits(
  dbKey: DbKey,
  options: ScanOptions,
): Promise<ReturnsError<ScanResult, ScanError>> {
  const mainRef = options.mainRef ?? "main";
  const scanned: string[] = [];
  const skipped: string[] = [];
  const failed: ScanFailure[] = [];

  const latest = await analyzedCommitsDb.getLatest(dbKey);
  const since = latest.result?.hash;

  const logResult = log(options.repoRoot, {
    ref: mainRef,
    since,
  });
  if (logResult.error) {
    // Empty repo / missing main — treat as no mainline commits rather than hard fail
    // when the ref simply doesn't exist yet.
    if (logResult.error.exitCode === 128) {
      // fall through with no mainline commits
    } else {
      return { error: logResult.error };
    }
  }
  // log returns newest-first; analyze oldest-first for nicer chronology.
  let mainline: GitCommit[] = [...(logResult.result ?? [])].reverse();
  if (options.limit !== undefined && options.limit >= 0) {
    // Keep the oldest `limit` among the new window so chronology stays contiguous.
    if (mainline.length > options.limit) {
      mainline = mainline.slice(0, options.limit);
    }
  }

  const refsResult = listRefs(options.repoRoot);
  if (refsResult.error) return { error: refsResult.error };

  const tipCommits = new Map<string, GitCommit>();
  for (const commit of mainline) {
    tipCommits.set(commit.hash, commit);
  }

  // When `--limit` is set (CLI/dev convenience), skip feature-branch tip discovery
  // so the run stays bounded to mainline commits only.
  if (options.limit === undefined) {
    for (const ref of refsResult.result) {
      if (ref.type !== "branch") continue;
      if (ref.name === mainRef) continue;
      if (tipCommits.has(ref.hash)) continue;

      const ancestor = isAncestor(options.repoRoot, ref.hash, mainRef);
      if (ancestor.error && ancestor.error.exitCode !== 128) {
        return { error: ancestor.error };
      }
      if (ancestor.result) continue; // already on main history

      // Synthesize a GitCommit for the tip from log -n1
      const tipLog = log(options.repoRoot, { ref: ref.hash, limit: 1 });
      if (tipLog.error) {
        failed.push({ hash: ref.hash, message: tipLog.error.message });
        continue;
      }
      if (tipLog.result[0]) {
        tipCommits.set(ref.hash, tipLog.result[0]);
      }
    }
  }

  for (const commit of tipCommits.values()) {
    const existing = await analyzedCommitsDb.getByHash(dbKey, commit.hash);
    if (existing.result) {
      skipped.push(commit.hash);
      continue;
    }
    // NotFound is expected for new commits
    if (existing.error) {
      // proceed
    }

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
