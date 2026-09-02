import path from "node:path";
import {
  matchExportPattern,
  resolvePackageExportPath,
  sortExportPatternKeys,
} from "../resolve/index.ts";
import type { PackageIndex, PackageInfo } from "../types.ts";

/** Resolve `#` entries from a package `imports` map (exact + pattern). */
export function resolveImportsMapSpecifier(
  specifier: string,
  importsMap: Record<string, string>,
): string | null {
  const exact = importsMap[specifier];
  if (exact) return exact;

  const patternKeys = sortExportPatternKeys(
    Object.keys(importsMap).filter((key) => key.includes("*")),
  );
  for (const patternKey of patternKeys) {
    const substituted = matchExportPattern(
      specifier,
      patternKey,
      importsMap[patternKey]!,
    );
    if (substituted) return substituted;
  }
  return null;
}

function posixJoin(...parts: string[]): string {
  return path.posix.join(...parts);
}

function repoPathCandidates(repoPath: string): string[] {
  const base = repoPath.replace(/\\/g, "/");
  return [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.vue`,
    `${base}.js`,
    posixJoin(base, "index.ts"),
    posixJoin(base, "index.tsx"),
    posixJoin(base, "index.js"),
  ];
}

function firstPathInTree(
  candidates: string[],
  treePaths: Set<string>,
): string | null {
  for (const c of candidates) {
    if (treePaths.has(c)) return c;
  }
  return null;
}

function packageForRepoPath(
  repoPath: string,
  roots: Array<{ packageName: string; directory: string }>,
): { packageName: string; directory: string } {
  let best: { packageName: string; directory: string } | null = null;
  for (const r of roots) {
    const d = r.directory;
    if (!d) {
      best = r;
      continue;
    }
    if (repoPath === d || repoPath.startsWith(`${d}/`)) {
      if (!best || d.length > best.directory.length) best = r;
    }
  }
  return best ?? { packageName: "(root)", directory: "" };
}

export interface CreateTreeResolveImportTargetOptions {
  treePaths: Set<string>;
  index: PackageIndex;
  importsMapByPackageDir: Map<string, Record<string, string>>;
  packageRoots: Array<{ packageName: string; directory: string }>;
}

/**
 * Resolve import specifiers to repo-relative paths using a commit tree (no FS).
 * Handles `#` import maps, relative imports, and workspace package exports.
 */
export function createTreeResolveImportTarget(
  options: CreateTreeResolveImportTargetOptions,
): (importerPath: string, specifier: string) => string | null {
  const { treePaths, index, importsMapByPackageDir, packageRoots } = options;

  return (importerPath: string, specifier: string): string | null => {
    const importerRoot = packageForRepoPath(importerPath, packageRoots);

    if (specifier.startsWith("#")) {
      const importsMap = importsMapByPackageDir.get(importerRoot.directory);
      if (!importsMap) return null;
      const mapped = resolveImportsMapSpecifier(specifier, importsMap);
      if (!mapped) return null;
      const pkgBase = importerRoot.directory;
      const joined = pkgBase
        ? posixJoin(pkgBase, mapped.replace(/^\.\//, ""))
        : mapped.replace(/^\.\//, "");
      return firstPathInTree(repoPathCandidates(joined), treePaths);
    }

    if (specifier.startsWith(".")) {
      const joined = posixJoin(
        path.posix.dirname(importerPath.replace(/\\/g, "/")),
        specifier,
      );
      const normalized = path.posix.normalize(joined);
      return firstPathInTree(repoPathCandidates(normalized), treePaths);
    }

    const names = [...index.keys()].sort((a, b) => b.length - a.length);
    for (const name of names) {
      if (specifier === name || specifier.startsWith(`${name}/`)) {
        const pkg = index.get(name)!;
        const sub =
          specifier === name ? "" : specifier.slice(name.length + 1);
        const exportPath = resolvePackageExportPath(pkg, sub);
        if (!exportPath) return null;
        const repoPath = exportPath.replace(/\\/g, "/");
        return firstPathInTree(repoPathCandidates(repoPath), treePaths);
      }
    }

    return null;
  };
}

/**
 * Repo-relative paths that are public `package.json` export targets, derived
 * from a commit tree (no filesystem).
 */
export function collectPublicExportPathsFromTree(
  packageRepoPath: string,
  exports: unknown,
  treePaths: Set<string>,
): string[] {
  if (!exports) return [];
  const pkg: PackageInfo = {
    dir: packageRepoPath || ".",
    exports,
  };
  const out = new Set<string>();
  const prefix = packageRepoPath ? `${packageRepoPath}/` : "";

  for (const rel of treePaths) {
    if (packageRepoPath && rel !== packageRepoPath && !rel.startsWith(prefix)) {
      continue;
    }
    if (
      !rel.endsWith(".ts") &&
      !rel.endsWith(".tsx") &&
      !rel.endsWith(".vue")
    ) {
      continue;
    }
    if (rel.endsWith(".d.ts")) continue;

    const local =
      packageRepoPath && rel !== packageRepoPath
        ? rel.slice(prefix.length)
        : rel;
    const withoutExt = local.replace(/\.(tsx?|vue)$/, "");
    let subpath = withoutExt;
    if (subpath === "index") {
      subpath = "";
    } else if (subpath.endsWith("/index")) {
      subpath = subpath.slice(0, -"/index".length);
    }

    const exportPath = resolvePackageExportPath(pkg, subpath);
    if (!exportPath) continue;
    const normalized = exportPath.replace(/\\/g, "/");
    if (treePaths.has(normalized)) {
      out.add(rel);
    }
  }

  if (typeof exports === "object" && exports !== null) {
    for (const target of Object.values(exports as Record<string, unknown>)) {
      let rel: string | null = null;
      if (typeof target === "string") {
        rel = target;
      } else if (target && typeof target === "object") {
        const cond = target as Record<string, unknown>;
        const t = cond.import ?? cond.default ?? cond.node;
        if (typeof t === "string") rel = t;
      }
      if (!rel || rel.includes("*")) continue;
      const repoPath = packageRepoPath
        ? posixJoin(packageRepoPath, rel.replace(/^\.\//, ""))
        : rel.replace(/^\.\//, "");
      const hit = firstPathInTree(repoPathCandidates(repoPath), treePaths);
      if (hit) out.add(hit);
    }
  }

  return [...out].sort();
}
