import type { DbKey } from "@saflib/drizzle";
import type { ReturnsError } from "@saflib/monorepo";
import { AnalyzedCommitNotFoundError } from "@saflib/dev-site-db/errors";
import { analyzedCommitsDb } from "@saflib/dev-site-db/queries/analyzed-commits/index";
import { packageMetricsDb } from "@saflib/dev-site-db/queries/package-metrics/index";
import { exportsDb } from "@saflib/dev-site-db/queries/exports/index";
import { testCasesDb } from "@saflib/dev-site-db/queries/test-cases/index";
import type { components } from "@saflib/dev-site-spec/operations/diffCommits";

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

function setDiff(
  from: Set<string>,
  to: Set<string>,
): { added: string[]; removed: string[] } {
  const added: string[] = [];
  const removed: string[] = [];
  for (const h of to) {
    if (!from.has(h)) added.push(h);
  }
  for (const h of from) {
    if (!to.has(h)) removed.push(h);
  }
  return { added, removed };
}

function toPackageMetrics(m: {
  packageName: string;
  directory: string;
  sourceFiles: number;
  sourceLines: number;
  prodLines: number;
  testLines: number;
  testFiles: number;
}): PackageMetrics {
  return {
    packageName: m.packageName,
    directory: m.directory,
    sourceFiles: m.sourceFiles,
    sourceLines: m.sourceLines,
    prodLines: m.prodLines,
    testLines: m.testLines,
    testFiles: m.testFiles,
  };
}

/**
 * Diff two analyzed commits. `fromHash` is the baseline ("before");
 * `toHash` is the comparison ("after").
 *
 * Export/test deltas use junction content-hashes (set difference), then
 * fetch only the def payloads for added/removed hashes.
 */
export async function diffCommits(
  dbKey: DbKey,
  fromHash: string,
  toHash: string,
): Promise<DiffCommitsResult> {
  const [fromCommit, toCommit] = await Promise.all([
    analyzedCommitsDb.getByHash(dbKey, fromHash),
    analyzedCommitsDb.getByHash(dbKey, toHash),
  ]);
  if (fromCommit.error) return { error: fromCommit.error };
  if (toCommit.error) return { error: toCommit.error };

  const [fromMetricsRes, toMetricsRes] = await Promise.all([
    packageMetricsDb.listByCommit(dbKey, fromHash),
    packageMetricsDb.listByCommit(dbKey, toHash),
  ]);
  const fromMetrics = fromMetricsRes.result!.map(toPackageMetrics);
  const toMetrics = toMetricsRes.result!.map(toPackageMetrics);

  const beforePkgs = new Map(fromMetrics.map((m) => [packageKey(m), m]));
  const afterPkgs = new Map(toMetrics.map((m) => [packageKey(m), m]));

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

  const [fromExportHashes, toExportHashes, fromTestHashes, toTestHashes] =
    await Promise.all([
      exportsDb.listHashesByCommit(dbKey, fromHash),
      exportsDb.listHashesByCommit(dbKey, toHash),
      testCasesDb.listHashesByCommit(dbKey, fromHash),
      testCasesDb.listHashesByCommit(dbKey, toHash),
    ]);

  const exportHashDiff = setDiff(
    new Set(fromExportHashes.result!),
    new Set(toExportHashes.result!),
  );
  const testHashDiff = setDiff(
    new Set(fromTestHashes.result!),
    new Set(toTestHashes.result!),
  );

  const [addedExports, removedExports, addedTests, removedTests] =
    await Promise.all([
      exportsDb.getByHashes(dbKey, exportHashDiff.added),
      exportsDb.getByHashes(dbKey, exportHashDiff.removed),
      testCasesDb.getByHashes(dbKey, testHashDiff.added),
      testCasesDb.getByHashes(dbKey, testHashDiff.removed),
    ]);

  const toExportEntry = (e: {
    packageName: string;
    filePath: string;
    name: string;
    kind: ExportEntry["kind"];
  }): ExportEntry => ({
    packageName: e.packageName,
    filePath: e.filePath,
    name: e.name,
    kind: e.kind,
  });
  const toTestCase = (t: {
    packageName: string;
    filePath: string;
    fullName: string;
  }): TestCase => ({
    packageName: t.packageName,
    filePath: t.filePath,
    fullName: t.fullName,
  });

  const commitDiff: CommitDiff = {
    fromHash,
    toHash,
    packageMetrics: { added, removed, changed },
    exports: {
      added: addedExports.result!.map(toExportEntry),
      removed: removedExports.result!.map(toExportEntry),
    },
    testCases: {
      added: addedTests.result!.map(toTestCase),
      removed: removedTests.result!.map(toTestCase),
    },
  };
  return { result: commitDiff };
}
