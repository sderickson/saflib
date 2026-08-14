import type { DbKey } from "@saflib/drizzle";
import type { ReturnsError } from "@saflib/monorepo";
import { AnalyzedCommitNotFoundError } from "@saflib/dev-site-db/errors";

import type { components as GetCommitComponents } from "@saflib/dev-site-spec/operations/getCommits";
import type { components as ListCommitsComponents } from "@saflib/dev-site-spec/operations/listCommits";
import { assembleCommitSymbols } from "./analyze-commit.ts";
import {
  debtCountFromIssueCounts,
  emptyIssueCountsByKind,
  type IssueCountsByKind,
  type PackageIssueKind,
} from "./package-issues.ts";

import { getByHash } from "@saflib/dev-site-db/queries/analyzed-commits/get-by-hash";
import { list } from "@saflib/dev-site-db/queries/analyzed-commits/list";
import { listByCommit } from "@saflib/dev-site-db/queries/package-metrics/list-by-commit";
import { listByCommit as listIssueStats } from "@saflib/dev-site-db/queries/package-issue-stats/list-by-commit";

export type CommitDetail = GetCommitComponents["schemas"]["commit-detail"];
export type CommitSummary = ListCommitsComponents["schemas"]["commit-summary"];

export type GetCommitResult = ReturnsError<
  CommitDetail,
  AnalyzedCommitNotFoundError
>;

export interface RepoReadOptions {
  repoRoot: string;
  productRoot?: string;
  mainRef?: string;
}

function toIso(d: Date): string {
  return d.toISOString();
}

function toApiTestCase(t: {
  packageName: string;
  filePath: string;
  fullName: string;
  subjectName: string | null;
  subjectSignature: string | null;
  subjectDocstring: string | null;
  subjectFilePath: string | null;
  subjectConfidence: "adjacent" | "package" | null;
}) {
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

function rollupIssueCounts(
  rows: Array<{ packageName: string; kind: string; count: number }>,
): {
  byPackage: Map<string, IssueCountsByKind>;
  totals: IssueCountsByKind;
} {
  const byPackage = new Map<string, IssueCountsByKind>();
  const totals = emptyIssueCountsByKind();
  for (const row of rows) {
    const kind = row.kind as PackageIssueKind;
    if (!(kind in totals)) continue;
    totals[kind] += row.count;
    const pkg = byPackage.get(row.packageName) ?? emptyIssueCountsByKind();
    pkg[kind] += row.count;
    byPackage.set(row.packageName, pkg);
  }
  return { byPackage, totals };
}

export async function getCommit(
  dbKey: DbKey,
  hash: string,
  repo: RepoReadOptions,
): Promise<GetCommitResult> {
  const commitRes = await getByHash(dbKey, hash);
  if (commitRes.error) {
    return { error: commitRes.error };
  }
  const commit = commitRes.result;

  const metricsRes = await listByCommit(dbKey, hash);
  const metrics = metricsRes.result!;
  const issueRows = (await listIssueStats(dbKey, hash)).result ?? [];
  const { byPackage } = rollupIssueCounts(issueRows);

  const symbols = await assembleCommitSymbols(dbKey, hash, {
    repoRoot: repo.repoRoot,
    productRoot: repo.productRoot,
    mainRef: repo.mainRef,
  });
  // Git errors while assembling are unexpected for an analyzed commit; surface as empty
  // rather than 500 if the tree vanished — still return metrics.
  const exportRows = symbols.result?.exports ?? [];
  const testRows = symbols.result?.testCases ?? [];

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
    packageMetrics: metrics.map((m) => {
      const issueCountsByKind =
        byPackage.get(m.packageName) ?? emptyIssueCountsByKind();
      return {
        packageName: m.packageName,
        directory: m.directory,
        sourceFiles: m.sourceFiles,
        sourceLines: m.sourceLines,
        prodLines: m.prodLines,
        testLines: m.testLines,
        testFiles: m.testFiles,
        issueCountsByKind,
        debtCount: debtCountFromIssueCounts(issueCountsByKind),
      };
    }),
    exports: exportRows.map((e) => ({
      packageName: e.packageName,
      filePath: e.filePath,
      name: e.name,
      kind: e.kind,
      signature: e.signature,
      docstring: e.docstring,
    })),
    testCases: testRows.map(toApiTestCase),
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
  const page = await list(dbKey, params);
  if (page.error) return { error: page.error };

  const commits: CommitSummary[] = [];
  for (const c of page.result.commits) {
    const metrics = (await listByCommit(dbKey, c.hash)).result!;
    const issueRows = (await listIssueStats(dbKey, c.hash)).result ?? [];
    const { totals } = rollupIssueCounts(issueRows);
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
        exportCount: c.exportCount,
        testCaseCount: c.testCaseCount,
        issueCountsByKind: totals,
        debtCount: debtCountFromIssueCounts(totals),
      },
    });
  }
  return {
    result: { commits, nextCursor: page.result.nextCursor },
  };
}
