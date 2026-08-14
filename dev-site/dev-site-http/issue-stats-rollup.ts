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
  rows: Array<{ packageName: string; kind: string; count: number }>,
): {
  byPackage: Map<string, IssueCountsByKind>;
  totals: IssueCountsByKind;
  hasIssueStats: boolean;
} {
  const byPackage = new Map<string, IssueCountsByKind>();
  const totals = emptyIssueCountsByKind();
  let hasIssueStats = false;
  for (const row of rows) {
    hasIssueStats = true;
    if (row.packageName === "__meta__") continue;
    const kind = row.kind as PackageIssueKind;
    if (!(kind in totals)) continue;
    totals[kind] += row.count;
    const pkg = byPackage.get(row.packageName) ?? emptyIssueCountsByKind();
    pkg[kind] += row.count;
    byPackage.set(row.packageName, pkg);
  }
  return { byPackage, totals, hasIssueStats };
}
