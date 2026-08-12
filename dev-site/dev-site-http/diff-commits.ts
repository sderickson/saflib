import type { DbKey } from "@saflib/drizzle";
import type { ReturnsError } from "@saflib/monorepo";
import { AnalyzedCommitNotFoundError } from "@saflib/dev-site-db/errors";
import { analyzedCommitsDb } from "@saflib/dev-site-db/queries/analyzed-commits/index";
import { packageMetricsDb } from "@saflib/dev-site-db/queries/package-metrics/index";
import type { components } from "@saflib/dev-site-spec/operations/diffCommits";
import {
  assembleCommitSymbols,
  type AnalyzedExport,
  type AnalyzedTestCase,
} from "./analyze-commit.ts";
import type { RepoReadOptions } from "./get-commit.ts";

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

function exportKey(e: AnalyzedExport | ExportEntry): string {
  return `${e.packageName}\0${e.filePath}\0${e.name}\0${e.kind}`;
}

function testCaseKey(t: AnalyzedTestCase | TestCase): string {
  return `${t.packageName}\0${t.filePath}\0${t.fullName}`;
}

function toApiTestCase(t: AnalyzedTestCase): TestCase {
  if (!t.subjectName || !t.subjectConfidence || !t.subjectFilePath) {
    return {
      packageName: t.packageName,
      filePath: t.filePath,
      fullName: t.fullName,
    };
  }
  return {
    packageName: t.packageName,
    filePath: t.filePath,
    fullName: t.fullName,
    subjectName: t.subjectName,
    subjectSignature: t.subjectSignature,
    subjectDocstring: t.subjectDocstring,
    subjectFilePath: t.subjectFilePath,
    subjectConfidence: t.subjectConfidence,
  };
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
 */
export async function diffCommits(
  dbKey: DbKey,
  fromHash: string,
  toHash: string,
  repo: RepoReadOptions,
): Promise<DiffCommitsResult> {
  const [fromCommit, toCommit] = await Promise.all([
    analyzedCommitsDb.getByHash(dbKey, fromHash),
    analyzedCommitsDb.getByHash(dbKey, toHash),
  ]);
  if (fromCommit.error) return { error: fromCommit.error };
  if (toCommit.error) return { error: toCommit.error };

  const [fromMetricsRes, toMetricsRes, fromSymbols, toSymbols] =
    await Promise.all([
      packageMetricsDb.listByCommit(dbKey, fromHash),
      packageMetricsDb.listByCommit(dbKey, toHash),
      assembleCommitSymbols(dbKey, fromHash, repo),
      assembleCommitSymbols(dbKey, toHash, repo),
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

  const fromExports = fromSymbols.result?.exports ?? [];
  const toExports = toSymbols.result?.exports ?? [];
  const fromTests = fromSymbols.result?.testCases ?? [];
  const toTests = toSymbols.result?.testCases ?? [];

  const exportDiff = diffLists(fromExports, toExports, exportKey);
  const testDiff = diffLists(fromTests, toTests, testCaseKey);

  const commitDiff: CommitDiff = {
    fromHash,
    toHash,
    packageMetrics: { added, removed, changed },
    exports: {
      added: exportDiff.added.map((e) => ({
        packageName: e.packageName,
        filePath: e.filePath,
        name: e.name,
        kind: e.kind,
        signature: e.signature,
        docstring: e.docstring,
      })),
      removed: exportDiff.removed.map((e) => ({
        packageName: e.packageName,
        filePath: e.filePath,
        name: e.name,
        kind: e.kind,
        signature: e.signature,
        docstring: e.docstring,
      })),
    },
    testCases: {
      added: testDiff.added.map(toApiTestCase),
      removed: testDiff.removed.map(toApiTestCase),
    },
  };
  return { result: commitDiff };
}
