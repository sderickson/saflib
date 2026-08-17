/**
 * Re-export issue collectors — canonical home is `@saflib/imports/issues`.
 */
export {
  collectPackageIssues,
  countIssuesByKind,
  debtCountFromIssueCounts,
  emptyIssueCountsByKind,
  DEBT_ISSUE_KINDS,
  PACKAGE_ISSUE_KINDS,
  type IssueCountsByKind,
  type PackageDetailForIssues,
  type PackageIssue,
  type PackageIssueKind,
} from "@saflib/imports/issues";
