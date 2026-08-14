/**
 * Classification heuristics for inventory-style package/file categorization.
 * Applied to git-tree paths (no checkout) so historical commits classify the same way.
 */

export const EXCLUDE_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "coverage",
  "playwright-report",
  "test-results",
  "scan-output",
  ".turbo",
  ".next",
  "out",
  "__pycache__",
  ".cache",
  "data",
]);

export const EXCLUDE_FILES = new Set([
  ".DS_Store",
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
]);

/** Extensions counted as source for LOC / export / test extraction. */
export const SOURCE_EXTS = new Set([
  ".ts",
  ".tsx",
  ".vue",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
]);

/** Heuristic: *.test.* / *.spec.* / *.fixtures.*, or under testing/ / tests/ / __tests__/. */
export function isTestSourcePath(relPosix: string, fileName: string): boolean {
  const lower = fileName.toLowerCase();
  if (
    lower.endsWith(".test.ts") ||
    lower.endsWith(".test.tsx") ||
    lower.endsWith(".test.js") ||
    lower.endsWith(".test.jsx") ||
    lower.endsWith(".spec.ts") ||
    lower.endsWith(".spec.tsx") ||
    lower.endsWith(".spec.js") ||
    lower.endsWith(".spec.jsx") ||
    lower.endsWith(".fixtures.ts") ||
    lower.endsWith(".fixtures.tsx")
  ) {
    return true;
  }
  const parts = relPosix.split("/");
  return (
    parts.includes("testing") ||
    parts.includes("tests") ||
    parts.includes("__tests__")
  );
}

/**
 * Workflow scaffold placeholders (e.g. `handlers/__group-name__/`), not real product code.
 * Double-underscore path segments mark copy-paste templates from SAF workflows.
 */
export function isScaffoldTemplatePath(relPosix: string): boolean {
  return relPosix.split("/").some((part) => /^__[^/]+__$/.test(part));
}

export function extOf(fileName: string): string {
  const i = fileName.lastIndexOf(".");
  if (i <= 0) return "";
  return fileName.slice(i).toLowerCase();
}

export function isSourcePath(relPosix: string): boolean {
  const parts = relPosix.split("/");
  if (parts.some((p) => EXCLUDE_DIRS.has(p) || (p.startsWith(".") && p !== "."))) {
    return false;
  }
  const fileName = parts[parts.length - 1] ?? "";
  if (EXCLUDE_FILES.has(fileName) || fileName.startsWith(".")) return false;
  if (fileName.endsWith(".map") || fileName.endsWith(".min.js")) return false;
  if (fileName.endsWith(".d.ts") || fileName.endsWith(".d.ts.map")) return false;
  return SOURCE_EXTS.has(extOf(fileName));
}

export function countLines(text: string): number {
  if (text.length === 0) return 0;
  let n = 0;
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) === 10) n++;
  }
  if (text.charCodeAt(text.length - 1) !== 10) n++;
  return n;
}

export interface PackageRoot {
  /** npm package name from package.json, or directory fallback. */
  packageName: string;
  /** Directory relative to repo root (posix, no trailing slash). "" for root. */
  directory: string;
}

/**
 * Build package roots from package.json paths in a git tree.
 * Longer directory prefixes win when assigning files to packages.
 */
export function packageRootsFromPackageJsonPaths(
  packageJsonPaths: string[],
  nameByPath: Map<string, string>,
): PackageRoot[] {
  const roots: PackageRoot[] = [];
  for (const pkgJsonPath of packageJsonPaths) {
    const parts = pkgJsonPath.split("/");
    if (parts.some((p) => EXCLUDE_DIRS.has(p))) continue;
    const directory =
      parts.length === 1 ? "" : parts.slice(0, -1).join("/");
    const packageName =
      nameByPath.get(pkgJsonPath) ||
      (directory ? directory.split("/").pop()! : "(root)");
    roots.push({ packageName, directory });
  }
  roots.sort((a, b) => b.directory.length - a.directory.length);
  return roots;
}

/** Assign a file path to the longest matching package directory prefix. */
export function packageForPath(
  relPosix: string,
  roots: PackageRoot[],
): PackageRoot {
  for (const root of roots) {
    if (root.directory === "") return root;
    if (relPosix === root.directory || relPosix.startsWith(root.directory + "/")) {
      return root;
    }
  }
  return { packageName: "(root)", directory: "" };
}

export function parsePackageName(packageJsonText: string): string | undefined {
  try {
    const parsed = JSON.parse(packageJsonText) as { name?: unknown };
    return typeof parsed.name === "string" ? parsed.name : undefined;
  } catch {
    return undefined;
  }
}

/** Heuristic: npm name / directory looks like a drizzle db package. */
export function looksLikeDbPackage(
  packageName: string,
  directory: string = "",
): boolean {
  const name = packageName.toLowerCase();
  const dir = directory.replace(/\\/g, "/").toLowerCase();
  return (
    name.endsWith("-db") ||
    name.includes("-db-") ||
    /\/[^/]*-db$/.test(dir) ||
    dir.endsWith("/service/db") ||
    /(^|\/)db$/.test(dir)
  );
}

/** Heuristic: npm name / directory looks like an Express `-http` package. */
export function looksLikeHttpPackage(
  packageName: string,
  directory: string = "",
): boolean {
  const name = packageName.toLowerCase();
  const dir = directory.replace(/\\/g, "/").toLowerCase();
  return (
    name.endsWith("-http") ||
    name.includes("-http-") ||
    /\/[^/]*-http$/.test(dir) ||
    dir.endsWith("/service/http") ||
    /(^|\/)http$/.test(dir)
  );
}

/** Heuristic: npm name / directory looks like an OpenAPI `-spec` package. */
export function looksLikeSpecPackage(
  packageName: string,
  directory: string = "",
): boolean {
  const name = packageName.toLowerCase();
  const dir = directory.replace(/\\/g, "/").toLowerCase();
  return (
    name.endsWith("-spec") ||
    name.includes("-spec-") ||
    /\/[^/]*-spec$/.test(dir) ||
    dir.endsWith("/service/spec") ||
    /(^|\/)spec$/.test(dir)
  );
}
