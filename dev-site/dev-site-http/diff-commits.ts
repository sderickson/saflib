import type { DbKey } from "@saflib/drizzle";
import type { ReturnsError } from "@saflib/monorepo";
import { AnalyzedCommitNotFoundError } from "@saflib/dev-site-db/errors";
import type { components } from "@saflib/dev-site-spec/operations/diffCommits";
import { getCommit, type CommitDetail } from "./get-commit.ts";

export type CommitDiff = components["schemas"]["commit-diff"];
export type PackageMetrics = components["schemas"]["package-metrics"];
export type ExportEntry = components["schemas"]["export-entry"];
export type TestCase = components["schemas"]["test-case"];

export type DiffCommitsResult = ReturnsError<
  CommitDiff,
  AnalyzedCommitNotFoundError
>;

function packageKey(m: PackageMetrics): string {
  return m.packageName;
}

function exportKey(e: ExportEntry): string {
  return `${e.packageName}\0${e.filePath}\0${e.name}\0${e.kind}`;
}

function testCaseKey(t: TestCase): string {
  return `${t.packageName}\0${t.filePath}\0${t.fullName}`;
}

function metricsEqual(a: PackageMetrics, b: PackageMetrics): boolean {
  return (
    a.sourceFiles === b.sourceFiles &&
    a.sourceLines === b.sourceLines &&
    a.prodLines === b.prodLines &&
    a.testLines === b.testLines &&
    a.testFiles === b.testFiles &&
    a.directory === b.directory
  );
}

function diffLists<T>(
  before: T[],
  after: T[],
  keyOf: (item: T) => string,
): { added: T[]; removed: T[] } {
  const beforeMap = new Map(before.map((i) => [keyOf(i), i]));
  const afterMap = new Map(after.map((i) => [keyOf(i), i]));
  const added: T[] = [];
  const removed: T[] = [];
  for (const [k, v] of afterMap) {
    if (!beforeMap.has(k)) added.push(v);
  }
  for (const [k, v] of beforeMap) {
    if (!afterMap.has(k)) removed.push(v);
  }
  return { added, removed };
}

/**
 * Diff two analyzed commits. `fromHash` is the baseline ("before");
 * `toHash` is the comparison ("after").
 */
export async function diffCommits(
  dbKey: DbKey,
  fromHash: string,
  toHash: string,
): Promise<DiffCommitsResult> {
  const [fromRes, toRes] = await Promise.all([
    getCommit(dbKey, fromHash),
    getCommit(dbKey, toHash),
  ]);
  if (fromRes.error) return { error: fromRes.error };
  if (toRes.error) return { error: toRes.error };

  const from: CommitDetail = fromRes.result;
  const to: CommitDetail = toRes.result;

  const beforePkgs = new Map(
    from.packageMetrics.map((m) => [packageKey(m), m]),
  );
  const afterPkgs = new Map(to.packageMetrics.map((m) => [packageKey(m), m]));

  const added: PackageMetrics[] = [];
  const removed: PackageMetrics[] = [];
  const changed: Array<{ before: PackageMetrics; after: PackageMetrics }> = [];

  for (const [k, after] of afterPkgs) {
    const before = beforePkgs.get(k);
    if (!before) {
      added.push(after);
    } else if (!metricsEqual(before, after)) {
      changed.push({ before, after });
    }
  }
  for (const [k, before] of beforePkgs) {
    if (!afterPkgs.has(k)) removed.push(before);
  }

  const exportDiff = diffLists(from.exports, to.exports, exportKey);
  const testDiff = diffLists(from.testCases, to.testCases, testCaseKey);

  const commitDiff: CommitDiff = {
    fromHash,
    toHash,
    packageMetrics: { added, removed, changed },
    exports: exportDiff,
    testCases: testDiff,
  };
  return { result: commitDiff };
}
