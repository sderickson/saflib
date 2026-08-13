/**
 * Resolve import specifiers to modules within a known package — no FS, linear
 * string ops only.
 */

export interface ImportUsedBy {
  packageName: string;
  /** Path within the importing package (no package-root prefix). */
  filePath: string;
  /** Repo-relative path for source links. */
  repoPath: string;
}

/** POSIX-ish resolve of `fromDir/specifier` without touching the filesystem. */
export function resolveRelative(fromFile: string, specifier: string): string {
  const fromDir = fromFile.includes("/")
    ? fromFile.slice(0, fromFile.lastIndexOf("/"))
    : "";
  const joined = fromDir ? `${fromDir}/${specifier}` : specifier;
  const parts: string[] = [];
  for (const p of joined.split("/")) {
    if (!p || p === ".") continue;
    if (p === "..") {
      parts.pop();
      continue;
    }
    parts.push(p);
  }
  return parts.join("/");
}

export function stripTsExt(path: string): string {
  return path.replace(/\.(tsx?|jsx?|mjs|cjs)$/, "");
}

/**
 * If `specifier` targets `packageName`, return the package-relative module path
 * without extension (e.g. `form-artifact-paths`, `queries/matter/create`).
 * Relative imports only resolve when the importer lives under `packageDirectory`.
 */
export function moduleTargetFromImport(
  packageName: string,
  packageDirectory: string,
  importerPath: string,
  specifier: string,
): string | null {
  const absPrefix = `${packageName}/`;
  let rel: string | null = null;

  if (specifier === packageName) {
    rel = "index";
  } else if (specifier.startsWith(absPrefix)) {
    rel = specifier.slice(absPrefix.length);
  } else if (specifier.startsWith(".")) {
    const pkgDir = packageDirectory.replace(/\/+$/, "");
    if (pkgDir) {
      if (!(importerPath === pkgDir || importerPath.startsWith(`${pkgDir}/`))) {
        return null;
      }
    }
    const resolved = stripTsExt(resolveRelative(importerPath, specifier));
    const pkgPrefix = pkgDir ? `${pkgDir}/` : "";
    if (pkgPrefix && resolved.startsWith(pkgPrefix)) {
      rel = resolved.slice(pkgPrefix.length);
    } else if (!pkgPrefix) {
      rel = resolved;
    } else {
      return null;
    }
  } else {
    return null;
  }

  if (rel == null || rel === "") return null;
  rel = stripTsExt(rel).replace(/\/+$/, "");
  if (rel.endsWith("/index")) {
    rel = rel.slice(0, -"/index".length);
  }
  if (rel === "" || rel === "index") return "index";
  return rel;
}

/** Package-local path for display: strip the package directory prefix. */
export function packageLocalPath(
  repoPath: string,
  packageDirectory: string,
): string {
  const dir = packageDirectory.replace(/\/+$/, "");
  if (!dir) return repoPath;
  if (repoPath === dir) return ".";
  if (repoPath.startsWith(`${dir}/`)) return repoPath.slice(dir.length + 1);
  return repoPath;
}

export function exportUsedByKey(filePath: string, exportName: string): string {
  return `${filePath}\0${exportName}`;
}
