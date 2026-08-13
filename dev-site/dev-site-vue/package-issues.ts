/**
 * Re-export shared issue collectors used by Spec → Issues and `saf-dev-site issues`.
 * Canonical implementation: `@saflib/dev-site-http/package-issues`.
 */
export {
  collectPackageIssues,
  type PackageIssue,
  type PackageIssueKind,
  type PackageDetailForIssues,
} from "@saflib/dev-site-http/package-issues";
