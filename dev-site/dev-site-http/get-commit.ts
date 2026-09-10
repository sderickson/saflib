import type { DbKey } from "@saflib/drizzle";
import type { ReturnsError } from "@saflib/utils";
import { AnalyzedCommitNotFoundError } from "@saflib/dev-site-db/errors";

import type { components as GetCommitComponents } from "@saflib/dev-site-spec/operations/getCommits";
import type { components as ListCommitsComponents } from "@saflib/dev-site-spec/operations/listCommits";
import { assembleCommitSymbols } from "./analyze-commit.ts";
import {
  debtCountFromIssueCounts,
  emptyIssueCountsByKind,
} from "./package-issues.ts";

import { getByHash } from "@saflib/dev-site-db/queries/analyzed-commits/get-by-hash";
import { list } from "@saflib/dev-site-db/queries/analyzed-commits/list";
import { listByCommit } from "@saflib/dev-site-db/queries/package-metrics/list-by-commit";
import { listByCommit as listIssueStats } from "@saflib/dev-site-db/queries/package-issue-stats/list-by-commit";
import { rollupIssueCounts } from "./issue-stats-rollup.ts";

export type CommitDetail = GetCommitComponents["schemas"]["commit-detail"];
export type CommitSummary = ListCommitsComponents["schemas"]["commit-summary"];

export type GetCommitResult = ReturnsError<
  CommitDetail,
  AnalyzedCommitNotFoundError
>;

export interface RepoReadOptions {
  repo_root: string;
  product_root?: string;
  mainRef?: string;
}

function toIso(d: Date): string {
  return d.toISOString();
}

function toApiTestCase(t: {
  package_name: string;
  file_path: string;
  full_name: string;
  subject_name: string | null;
  subject_signature: string | null;
  subject_docstring: string | null;
  subject_file_path: string | null;
  subject_confidence: "adjacent" | "package" | null;
}) {
  if (!t.subject_name || !t.subject_confidence || !t.subject_file_path) {
    return {
      package_name: t.package_name,
      file_path: t.file_path,
      full_name: t.full_name,
    };
  }
  return {
    package_name: t.package_name,
    file_path: t.file_path,
    full_name: t.full_name,
    subject_name: t.subject_name,
    subject_signature: t.subject_signature,
    subject_docstring: t.subject_docstring,
    subject_file_path: t.subject_file_path,
    subject_confidence: t.subject_confidence,
  };
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
    repo_root: repo.repo_root,
    product_root: repo.product_root,
    mainRef: repo.mainRef,
  });
  // Git errors while assembling are unexpected for an analyzed commit; surface as empty
  // rather than 500 if the tree vanished — still return metrics.
  const exportRows = symbols.result?.exports ?? [];
  const testRows = symbols.result?.test_cases ?? [];

  const detail: CommitDetail = {
    commit: {
      hash: commit.hash,
      parent_hashes: commit.parent_hashes,
      authored_at: toIso(commit.authored_at),
      message: commit.message,
      refs: commit.refs,
      analyzer_version: commit.analyzer_version,
      computed_at: toIso(commit.computed_at),
      status: commit.status,
    },
    package_metrics: metrics.map((m) => {
      const issue_counts_by_kind =
        byPackage.get(m.package_name) ?? emptyIssueCountsByKind();
      return {
        package_name: m.package_name,
        directory: m.directory,
        source_files: m.source_files,
        source_lines: m.source_lines,
        prod_lines: m.prod_lines,
        test_lines: m.test_lines,
        test_files: m.test_files,
        issue_counts_by_kind,
        debt_count: debtCountFromIssueCounts(issue_counts_by_kind),
      };
    }),
    exports: exportRows.map((e) => ({
      package_name: e.package_name,
      file_path: e.file_path,
      name: e.name,
      kind: e.kind,
      signature: e.signature,
      docstring: e.docstring,
    })),
    test_cases: testRows.map(toApiTestCase),
  };
  return { result: detail };
}

export async function listCommitSummaries(
  dbKey: DbKey,
  params: { cursor?: string; limit?: number } = {},
): Promise<
  ReturnsError<
    { commits: CommitSummary[]; next_cursor: string | null },
    AnalyzedCommitNotFoundError
  >
> {
  const page = await list(dbKey, params);
  if (page.error) return { error: page.error };

  const commits: CommitSummary[] = [];
  for (const c of page.result.commits) {
    const metrics = (await listByCommit(dbKey, c.hash)).result!;
    const issueRows = (await listIssueStats(dbKey, c.hash)).result ?? [];
    const { totals, has_issue_stats } = rollupIssueCounts(issueRows);
    commits.push({
      hash: c.hash,
      parent_hashes: c.parent_hashes,
      authored_at: toIso(c.authored_at),
      message: c.message,
      refs: c.refs,
      analyzer_version: c.analyzer_version,
      computed_at: toIso(c.computed_at),
      status: c.status,
      summary_metrics: {
        package_count: metrics.length,
        source_files: metrics.reduce((n, m) => n + m.source_files, 0),
        source_lines: metrics.reduce((n, m) => n + m.source_lines, 0),
        test_files: metrics.reduce((n, m) => n + m.test_files, 0),
        test_lines: metrics.reduce((n, m) => n + m.test_lines, 0),
        export_count: c.export_count,
        test_case_count: c.test_case_count,
        issue_counts_by_kind: totals,
        debt_count: debtCountFromIssueCounts(totals),
        has_issue_stats,
      },
    });
  }
  return {
    result: { commits, next_cursor: page.result.next_cursor },
  };
}
