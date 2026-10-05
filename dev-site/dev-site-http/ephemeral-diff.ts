import type { DbKey } from "@saflib/drizzle";
import type { GitCommit } from "@saflib/git";
import { analyzeCommit, type AnalyzeCommitOptions, type AnalyzedSnapshot } from "./analyze-commit.ts";
import {
  packageKey,
  metricsEqual,
  exportKey,
  testCaseKey,
  toApiTestCase,
  diffLists,
  toPackageMetrics,
  type CommitDiff,
} from "./diff-commits.ts";

/** No `authored_at`/parents of its own — plumbing (`listTree`/`readBlobs`) never reads these fields. */
function syntheticCommit(hash: string): GitCommit {
  return { hash, parentHashes: [], authoredAt: new Date(0).toISOString(), subject: "" };
}

async function snapshotFor(
  dbKey: DbKey,
  hash: string,
  options: AnalyzeCommitOptions,
): Promise<AnalyzedSnapshot> {
  const { result, error } = await analyzeCommit(dbKey, syntheticCommit(hash), options);
  if (error) throw error;
  return result;
}

/**
 * A `CommitDiff` between two commit hashes, computed entirely fresh via
 * `analyzeCommit` — no `analyzed_commits`/`package_metrics` DB rows read or
 * written, so both `fromHash`/`toHash` can be real commits that were never
 * scanned, or (from `preview-diff.ts`) a synthetic, never-referenced one.
 * `db_schemas` is left empty for now — see `saflib/plans/
 * workflow-preview.md`'s "explicitly out of scope" for why. Shared by
 * `previewRunDiff` (hypothetical) and `reflectRunDiff` (actual).
 */
export async function diffHashesEphemeral(
  devSiteDbKey: DbKey,
  fromHash: string,
  toHash: string,
  repo: AnalyzeCommitOptions,
): Promise<CommitDiff> {
  const [fromSnapshot, toSnapshot] = await Promise.all([
    snapshotFor(devSiteDbKey, fromHash, repo),
    snapshotFor(devSiteDbKey, toHash, repo),
  ]);

  const fromMetrics = fromSnapshot.package_metrics.map((m) => toPackageMetrics(m));
  const toMetrics = toSnapshot.package_metrics.map((m) => toPackageMetrics(m));
  const beforePkgs = new Map(fromMetrics.map((m) => [packageKey(m), m]));
  const afterPkgs = new Map(toMetrics.map((m) => [packageKey(m), m]));

  const added = [];
  const removed = [];
  const changed = [];
  for (const [k, after] of afterPkgs) {
    const before = beforePkgs.get(k);
    if (!before) added.push(after);
    else if (!metricsEqual(before, after)) changed.push({ before, after });
  }
  for (const [k, before] of beforePkgs) {
    if (!afterPkgs.has(k)) removed.push(before);
  }

  const exportDiff = diffLists(fromSnapshot.exports, toSnapshot.exports, exportKey);
  const testDiff = diffLists(fromSnapshot.test_cases, toSnapshot.test_cases, testCaseKey);

  return {
    from_hash: fromHash,
    to_hash: toHash,
    package_metrics: { added, removed, changed },
    exports: {
      added: exportDiff.added.map((e) => ({
        package_name: e.package_name,
        file_path: e.file_path,
        name: e.name,
        kind: e.kind,
        signature: e.signature,
        docstring: e.docstring,
      })),
      removed: exportDiff.removed.map((e) => ({
        package_name: e.package_name,
        file_path: e.file_path,
        name: e.name,
        kind: e.kind,
        signature: e.signature,
        docstring: e.docstring,
      })),
    },
    test_cases: {
      added: testDiff.added.map(toApiTestCase),
      removed: testDiff.removed.map(toApiTestCase),
    },
    db_schemas: {
      tables: { added: [], removed: [] },
      columns: { added: [], removed: [], changed: [] },
    },
  };
}
