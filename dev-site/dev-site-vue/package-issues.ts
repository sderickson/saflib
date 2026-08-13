/**
 * Re-export shared issue collectors used by Spec → Issues and `saf-dev-site issues`.
 * Use the `/issues` subpath — the package root pulls Node-only modules into Vite.
 */
export {
  collectPackageIssues,
  type PackageIssue,
  type PackageIssueKind,
  type PackageDetailForIssues,
} from "@saflib/imports/issues";
