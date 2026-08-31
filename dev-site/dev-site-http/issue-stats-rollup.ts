import {
  emptyIssueCountsByKind,
  type IssueCountsByKind,
  type PackageIssueKind,
} from "./package-issues.ts";

/**
 * Roll package_issue_stats rows into per-package and total counts.
 * `__meta__` rows mark that stats were computed but are ignored in counts.
 */
export function rollupIssueCounts(
  rows: Array<{ package_name: string; kind: string; count: number }>,
): {
  byPackage: Map<string, IssueCountsByKind>;
  totals: IssueCountsByKind;
  has_issue_stats: boolean;
} {
  const byPackage = new Map<string, IssueCountsByKind>();
  const totals = emptyIssueCountsByKind();
  let has_issue_stats = false;
  for (const row of rows) {
    has_issue_stats = true;
    if (row.package_name === "__meta__") continue;
    const kind = row.kind as PackageIssueKind;
    if (!(kind in totals)) continue;
    totals[kind] += row.count;
    const pkg = byPackage.get(row.package_name) ?? emptyIssueCountsByKind();
    pkg[kind] += row.count;
    byPackage.set(row.package_name, pkg);
  }
  return { byPackage, totals, has_issue_stats };
}
