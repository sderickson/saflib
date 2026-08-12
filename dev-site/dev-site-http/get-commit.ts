import type { DbKey } from "@saflib/drizzle";
import type { ReturnsError } from "@saflib/monorepo";
import { AnalyzedCommitNotFoundError } from "@saflib/dev-site-db/errors";
import { analyzedCommitsDb } from "@saflib/dev-site-db/queries/analyzed-commits/index";
import { packageMetricsDb } from "@saflib/dev-site-db/queries/package-metrics/index";
import { exportsDb } from "@saflib/dev-site-db/queries/exports/index";
import { testCasesDb } from "@saflib/dev-site-db/queries/test-cases/index";
import type { components as GetCommitComponents } from "@saflib/dev-site-spec/operations/getCommits";
import type { components as ListCommitsComponents } from "@saflib/dev-site-spec/operations/listCommits";

export type CommitDetail = GetCommitComponents["schemas"]["commit-detail"];
export type CommitSummary = ListCommitsComponents["schemas"]["commit-summary"];

export type GetCommitResult = ReturnsError<
  CommitDetail,
  AnalyzedCommitNotFoundError
>;

function toIso(d: Date): string {
  return d.toISOString();
}

export async function getCommit(
  dbKey: DbKey,
  hash: string,
): Promise<GetCommitResult> {
  const commitRes = await analyzedCommitsDb.getByHash(dbKey, hash);
  if (commitRes.error) {
    return { error: commitRes.error };
  }
  const commit = commitRes.result;

  const [metricsRes, exportsRes, testsRes] = await Promise.all([
    packageMetricsDb.listByCommit(dbKey, hash),
    exportsDb.listByCommit(dbKey, hash),
    testCasesDb.listByCommit(dbKey, hash),
  ]);
  // These list queries are typed as never-error.
  const metrics = metricsRes.result!;
  const exportRows = exportsRes.result!;
  const testRows = testsRes.result!;

  const detail: CommitDetail = {
    commit: {
      hash: commit.hash,
      parentHashes: commit.parentHashes,
      authoredAt: toIso(commit.authoredAt),
      message: commit.message,
      refs: commit.refs,
      analyzerVersion: commit.analyzerVersion,
      computedAt: toIso(commit.computedAt),
      status: commit.status,
    },
    packageMetrics: metrics.map((m) => ({
      packageName: m.packageName,
      directory: m.directory,
      sourceFiles: m.sourceFiles,
      sourceLines: m.sourceLines,
      prodLines: m.prodLines,
      testLines: m.testLines,
      testFiles: m.testFiles,
    })),
    exports: exportRows.map((e) => ({
      packageName: e.packageName,
      filePath: e.filePath,
      name: e.name,
      kind: e.kind,
    })),
    testCases: testRows.map((t) => ({
      packageName: t.packageName,
      filePath: t.filePath,
      fullName: t.fullName,
    })),
  };
  return { result: detail };
}

export async function listCommitSummaries(
  dbKey: DbKey,
  params: { cursor?: string; limit?: number } = {},
): Promise<
  ReturnsError<
    { commits: CommitSummary[]; nextCursor: string | null },
    AnalyzedCommitNotFoundError
  >
> {
  const page = await analyzedCommitsDb.list(dbKey, params);
  if (page.error) return { error: page.error };

  const commits: CommitSummary[] = [];
  for (const c of page.result.commits) {
    const metrics = (await packageMetricsDb.listByCommit(dbKey, c.hash))
      .result!;
    const exportCount = (await exportsDb.countByCommit(dbKey, c.hash)).result!;
    const testCaseCount = (await testCasesDb.countByCommit(dbKey, c.hash))
      .result!;
    commits.push({
      hash: c.hash,
      parentHashes: c.parentHashes,
      authoredAt: toIso(c.authoredAt),
      message: c.message,
      refs: c.refs,
      analyzerVersion: c.analyzerVersion,
      computedAt: toIso(c.computedAt),
      status: c.status,
      summaryMetrics: {
        packageCount: metrics.length,
        sourceFiles: metrics.reduce((n, m) => n + m.sourceFiles, 0),
        sourceLines: metrics.reduce((n, m) => n + m.sourceLines, 0),
        testFiles: metrics.reduce((n, m) => n + m.testFiles, 0),
        testLines: metrics.reduce((n, m) => n + m.testLines, 0),
        exportCount,
        testCaseCount,
      },
    });
  }
  return {
    result: { commits, nextCursor: page.result.nextCursor },
  };
}
