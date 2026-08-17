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
  | "oversized-file"
  | "package-layout";

export const PACKAGE_ISSUE_KINDS: readonly PackageIssueKind[] = [
  "dead-code",
  "oversized-file",
  "package-layout",
] as const;

/** All issue kinds count toward architectural debt. */
export const DEBT_ISSUE_KINDS: readonly PackageIssueKind[] = PACKAGE_ISSUE_KINDS;

export type IssueCountsByKind = Record<PackageIssueKind, number>;

export function emptyIssueCountsByKind(): IssueCountsByKind {
  return {
    "dead-code": 0,
    "oversized-file": 0,
    "package-layout": 0,
  };
}

export function countIssuesByKind(
  issues: Array<{ kind: PackageIssueKind }>,
): IssueCountsByKind {
  const counts = emptyIssueCountsByKind();
  for (const issue of issues) {
    counts[issue.kind] += 1;
  }
  return counts;
}

export function debtCountFromIssueCounts(counts: IssueCountsByKind): number {
  let n = 0;
  for (const kind of DEBT_ISSUE_KINDS) {
    n += counts[kind];
  }
  return n;
}

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
  /**
   * Repo-relative files that `package.json` `exports` (SPA `main.ts`,
   * `./test-app`, …). Skipped for dead-code — they are public API.
   */
  publicExportFilePaths?: string[];
}

/**
 * Graph-derived issues: dead exports/queries (plus merged layoutIssues).
 * Same-file-only exports are not reported — self-use is enough to clear dead-code.
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
    const publicFiles = new Set(detail.publicExportFilePaths ?? []);
    const publicLocals = new Set<string>();
    for (const p of publicFiles) {
      publicLocals.add(packageLocalPath(p, packageDirectory, productRoot));
    }
    for (const exp of detail.exports ?? []) {
      if (!CARD_EXPORT_KINDS.has(exp.kind)) continue;
      const local = packageLocalPath(
        exp.filePath,
        packageDirectory,
        productRoot,
      );
      if (
        publicFiles.has(exp.filePath) ||
        publicFiles.has(local) ||
        publicLocals.has(local)
      ) {
        continue;
      }
      if (!exp.usedBy || exp.usedBy.length === 0) {
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
