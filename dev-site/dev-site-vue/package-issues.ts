import { isCardExport, packageLocalPath } from "./test-tree";

export type PackageIssueKind = "dead-code";

export interface PackageIssue {
  kind: PackageIssueKind;
  /** Short label for the issue row. */
  title: string;
  /** Export or query symbol name. */
  name: string;
  kindLabel: string;
  /** Package-local path for display. */
  filePath: string;
  /** Repo-relative path for open-source. */
  repoPath: string;
}

type UsedBy = { packageName: string; filePath: string; repoPath: string };

export interface PackageDetailForIssues {
  packageName: string;
  directory?: string;
  productRoot?: string;
  exports?: Array<{
    name: string;
    kind: string;
    filePath: string;
    usedBy?: UsedBy[] | null;
  }>;
  dbInventory?: {
    entities: Array<{
      entity: string;
      queries: Array<{
        fileName: string;
        filePath: string;
        exportName?: string | null;
        usedBy?: UsedBy[] | null;
      }>;
    }>;
  };
}

/**
 * Currently: exports / query leaves with no non-test importers (`usedBy` empty).
 */
export function collectPackageIssues(
  detail: PackageDetailForIssues,
  options: { packageDirectory?: string; productRoot?: string } = {},
): PackageIssue[] {
  const packageDirectory = options.packageDirectory ?? detail.directory ?? "";
  const productRoot = options.productRoot ?? detail.productRoot ?? "";
  const issues: PackageIssue[] = [];

  if (detail.dbInventory?.entities?.length) {
    for (const entity of detail.dbInventory.entities) {
      for (const q of entity.queries) {
        if (q.usedBy && q.usedBy.length > 0) continue;
        const name = q.exportName || q.fileName;
        const local = packageLocalPath(
          q.filePath,
          packageDirectory,
          productRoot,
        );
        issues.push({
          kind: "dead-code",
          title: "Dead code",
          name,
          kindLabel: "query",
          filePath: local,
          repoPath: q.filePath,
        });
      }
    }
  } else {
    for (const exp of detail.exports ?? []) {
      // Focus on executable surface; types-only noise belongs in a later issue kind.
      if (!isCardExport(exp.kind)) continue;
      if (exp.usedBy && exp.usedBy.length > 0) continue;
      const local = packageLocalPath(
        exp.filePath,
        packageDirectory,
        productRoot,
      );
      issues.push({
        kind: "dead-code",
        title: "Dead code",
        name: exp.name,
        kindLabel: exp.kind,
        filePath: local,
        repoPath: exp.filePath,
      });
    }
  }

  issues.sort(
    (a, b) =>
      a.filePath.localeCompare(b.filePath) || a.name.localeCompare(b.name),
  );
  return issues;
}
