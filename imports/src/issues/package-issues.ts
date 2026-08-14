/**
 * Package-level architecture issues from export usedBy / layout / LoC.
 * Pure — safe for CLI, Spec UI, and analyze-package.
 */

const CARD_EXPORT_KINDS = new Set(["function", "class", "const"]);

function packageLocalPath(
  filePath: string,
  packageDirectory: string,
  productRoot: string = "",
): string {
  const parts = [productRoot, packageDirectory]
    .map((p) => p.replace(/^\/+|\/+$/g, ""))
    .filter(Boolean);
  const prefix = parts.join("/");
  if (!prefix) return filePath;
  const withSlash = prefix.endsWith("/") ? prefix : `${prefix}/`;
  if (filePath === prefix) return ".";
  if (filePath.startsWith(withSlash)) return filePath.slice(withSlash.length);
  const dir = packageDirectory.replace(/^\/+|\/+$/g, "");
  if (dir) {
    const d = dir.endsWith("/") ? dir : `${dir}/`;
    if (filePath.startsWith(d)) return filePath.slice(d.length);
  }
  return filePath;
}

export type PackageIssueKind =
  | "dead-code"
  | "same-file-only-export"
  | "oversized-file"
  | "package-layout";

export interface PackageIssue {
  kind: PackageIssueKind;
  /** Short label for the issue row. */
  title: string;
  /** Export, query, or file symbol name. */
  name: string;
  kindLabel: string;
  /** Package-local path for display. */
  filePath: string;
  /** Repo-relative path for open-source (or package-local when unknown). */
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
  /**
   * Layout / oversized findings (e.g. from `checkPackageLayout`).
   * Merged into the returned list so Spec UI and `--workdir` CLI share one collector.
   */
  layoutIssues?: PackageIssue[];
}

function isSameFileOnly(
  exportFilePath: string,
  usedBy: UsedBy[] | null | undefined,
): boolean {
  if (!usedBy || usedBy.length === 0) return false;
  return usedBy.every((u) => u.repoPath === exportFilePath);
}

/**
 * Graph-derived issues: dead exports/queries and same-file-only exports.
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
      if (!CARD_EXPORT_KINDS.has(exp.kind)) continue;
      const local = packageLocalPath(
        exp.filePath,
        packageDirectory,
        productRoot,
      );
      if (!exp.usedBy || exp.usedBy.length === 0) {
        issues.push({
          kind: "dead-code",
          title: "Dead code",
          name: exp.name,
          kindLabel: exp.kind,
          filePath: local,
          repoPath: exp.filePath,
        });
        continue;
      }
      if (isSameFileOnly(exp.filePath, exp.usedBy)) {
        issues.push({
          kind: "same-file-only-export",
          title: "Same-file-only export",
          name: exp.name,
          kindLabel: exp.kind,
          filePath: local,
          repoPath: exp.filePath,
        });
      }
    }
  }

  for (const layout of detail.layoutIssues ?? []) {
    issues.push({ ...layout });
  }

  issues.sort(
    (a, b) =>
      a.filePath.localeCompare(b.filePath) || a.name.localeCompare(b.name),
  );
  return issues;
}
