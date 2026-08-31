import type { IssueCountsByKind } from "@saflib/imports/issues";

/** Zeroed issue counts for test fixtures / health helpers. */
export function emptyIssueCountsFixture(): IssueCountsByKind {
  return {
    "dead-code": 0,
    "oversized-file": 0,
    "package-layout": 0,
  };
}

export function summaryMetricsFixture(
  partial: {
    package_count?: number;
    source_files?: number;
    source_lines?: number;
    test_files?: number;
    test_lines?: number;
    export_count?: number;
    test_case_count?: number;
    issue_counts_by_kind?: IssueCountsByKind;
    debt_count?: number;
    has_issue_stats?: boolean;
  } = {},
) {
  const issue_counts_by_kind =
    partial.issue_counts_by_kind ?? emptyIssueCountsFixture();
  return {
    package_count: partial.package_count ?? 1,
    source_files: partial.source_files ?? 1,
    source_lines: partial.source_lines ?? 0,
    test_files: partial.test_files ?? 0,
    test_lines: partial.test_lines ?? 0,
    export_count: partial.export_count ?? 0,
    test_case_count: partial.test_case_count ?? 0,
    issue_counts_by_kind,
    debt_count: partial.debt_count ?? 0,
    has_issue_stats: partial.has_issue_stats ?? true,
  };
}

export function packageMetricsFixture(
  partial: {
    package_name?: string;
    directory?: string;
    source_files?: number;
    source_lines?: number;
    prod_lines?: number;
    test_lines?: number;
    test_files?: number;
    issue_counts_by_kind?: IssueCountsByKind;
    debt_count?: number;
  } = {},
) {
  const issue_counts_by_kind =
    partial.issue_counts_by_kind ?? emptyIssueCountsFixture();
  return {
    package_name: partial.package_name ?? "@example/pkg",
    directory: partial.directory ?? "pkg",
    source_files: partial.source_files ?? 1,
    source_lines: partial.source_lines ?? 10,
    prod_lines: partial.prod_lines ?? 10,
    test_lines: partial.test_lines ?? 0,
    test_files: partial.test_files ?? 0,
    issue_counts_by_kind,
    debt_count: partial.debt_count ?? 0,
  };
}
