import type { PackageKind } from "./package-kind.ts";
import { classifyPackageKind } from "./package-kind.ts";
import type { IssueCountsByKind } from "./package-issues.ts";
import { emptyIssueCountsByKind } from "./package-issues.ts";

export type PackageDirNodeKind = "dir" | "package";

export interface PackageDirNode {
  id: string;
  label: string;
  kind: PackageDirNodeKind;
  /** Present when kind === "package". */
  packageName?: string;
  packageKind?: PackageKind;
  debtCount?: number;
  issueCountsByKind?: IssueCountsByKind;
  sourceLines?: number;
  testLines?: number;
  directory?: string;
  children: PackageDirNode[];
}

export interface PackageDirInput {
  packageName: string;
  directory: string;
  sourceLines?: number;
  testLines?: number;
  testFiles?: number;
  debtCount?: number;
  issueCountsByKind?: IssueCountsByKind;
}

/**
 * Build a directory tree that stops at package.json roots (analyzed packages).
 * Intermediate path segments are dirs; leaf package directories are package nodes.
 */
export function buildPackageDirTree(
  packages: PackageDirInput[],
): PackageDirNode[] {
  const root: PackageDirNode = {
    id: "root",
    label: "",
    kind: "dir",
    children: [],
  };

  const sorted = [...packages].sort((a, b) =>
    a.directory.localeCompare(b.directory),
  );

  for (const pkg of sorted) {
    const dir = pkg.directory.replace(/^\/+|\/+$/g, "");
    const parts = dir ? dir.split("/").filter(Boolean) : [];
    let node = root;

    const packageFields = {
      packageName: pkg.packageName,
      packageKind: classifyPackageKind(pkg.packageName, pkg.directory),
      debtCount: pkg.debtCount ?? 0,
      issueCountsByKind: pkg.issueCountsByKind ?? emptyIssueCountsByKind(),
      sourceLines: pkg.sourceLines ?? 0,
      testLines: pkg.testLines ?? 0,
      directory: pkg.directory,
    };

    if (parts.length === 0) {
      const child: PackageDirNode = {
        id: `pkg:${pkg.packageName}`,
        label: pkg.packageName,
        kind: "package",
        ...packageFields,
        children: [],
      };
      root.children.push(child);
      continue;
    }

    for (let i = 0; i < parts.length; i++) {
      const label = parts[i]!;
      const isLeaf = i === parts.length - 1;
      const pathSoFar = parts.slice(0, i + 1).join("/");

      if (isLeaf) {
        let child = node.children.find(
          (c) => c.kind === "package" && c.packageName === pkg.packageName,
        );
        if (!child) {
          child = {
            id: `pkg:${pkg.packageName}`,
            label,
            kind: "package",
            ...packageFields,
            children: [],
          };
          node.children.push(child);
        }
      } else {
        let child = node.children.find(
          (c) => c.kind === "dir" && c.label === label,
        );
        if (!child) {
          child = {
            id: `dir:${pathSoFar}`,
            label,
            kind: "dir",
            children: [],
          };
          node.children.push(child);
        }
        node = child;
      }
    }
  }

  sortNodes(root);
  return root.children;
}

function sortNodes(node: PackageDirNode): void {
  node.children.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "dir" ? -1 : 1;
    return a.label.localeCompare(b.label);
  });
  for (const c of node.children) sortNodes(c);
}

export function packageKindIcon(kind: PackageKind | undefined): string {
  switch (kind) {
    case "db":
      return "mdi-database-outline";
    case "http":
      return "mdi-api";
    case "spec":
      return "mdi-file-document-outline";
    case "spa":
      return "mdi-vuejs";
    case "sdk":
      return "mdi-package-variant-closed";
    case "lib":
      return "mdi-library-shelves";
    case "integration":
      return "mdi-connection";
    default:
      return "mdi-folder-outline";
  }
}
