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
    packageCount?: number;
    sourceFiles?: number;
    sourceLines?: number;
    testFiles?: number;
    testLines?: number;
    exportCount?: number;
    testCaseCount?: number;
    issueCountsByKind?: IssueCountsByKind;
    debtCount?: number;
    hasIssueStats?: boolean;
  } = {},
) {
  const issueCountsByKind =
    partial.issueCountsByKind ?? emptyIssueCountsFixture();
  return {
    packageCount: partial.packageCount ?? 1,
    sourceFiles: partial.sourceFiles ?? 1,
    sourceLines: partial.sourceLines ?? 0,
    testFiles: partial.testFiles ?? 0,
    testLines: partial.testLines ?? 0,
    exportCount: partial.exportCount ?? 0,
    testCaseCount: partial.testCaseCount ?? 0,
    issueCountsByKind,
    debtCount: partial.debtCount ?? 0,
    hasIssueStats: partial.hasIssueStats ?? true,
  };
}

export function packageMetricsFixture(
  partial: {
    packageName?: string;
    directory?: string;
    sourceFiles?: number;
    sourceLines?: number;
    prodLines?: number;
    testLines?: number;
    testFiles?: number;
    issueCountsByKind?: IssueCountsByKind;
    debtCount?: number;
  } = {},
) {
  const issueCountsByKind =
    partial.issueCountsByKind ?? emptyIssueCountsFixture();
  return {
    packageName: partial.packageName ?? "@example/pkg",
    directory: partial.directory ?? "pkg",
    sourceFiles: partial.sourceFiles ?? 1,
    sourceLines: partial.sourceLines ?? 10,
    prodLines: partial.prodLines ?? 10,
    testLines: partial.testLines ?? 0,
    testFiles: partial.testFiles ?? 0,
    issueCountsByKind,
    debtCount: partial.debtCount ?? 0,
  };
}
