/**
 * File/path helpers for inventory (git-tree paths, no checkout).
 * Package *kind* lives in `@saflib/monorepo` (`saf.kind` / identifier deps).
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
  /** Authored OpenAPI (and similar) YAML; generated output is under `dist/`. */
  ".yaml",
  ".yml",
]);

/** Heuristic: *.test.* / *.spec.* / *.fixture(s).* / *.test-helpers.*, or under testing/ / tests/ / __tests__/. */
export function isTestSourcePath(relPosix: string, file_name: string): boolean {
  const lower = file_name.toLowerCase();
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
    lower.endsWith(".fixtures.tsx") ||
    lower.endsWith(".fixture.ts") ||
    lower.endsWith(".fixture.tsx") ||
    lower.endsWith(".test-helpers.ts") ||
    lower.endsWith(".test-helpers.tsx")
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

export function extOf(file_name: string): string {
  const i = file_name.lastIndexOf(".");
  if (i <= 0) return "";
  return file_name.slice(i).toLowerCase();
}

export function isSourcePath(relPosix: string): boolean {
  const parts = relPosix.split("/");
  if (parts.some((p) => EXCLUDE_DIRS.has(p) || (p.startsWith(".") && p !== "."))) {
    return false;
  }
  const file_name = parts[parts.length - 1] ?? "";
  if (EXCLUDE_FILES.has(file_name) || file_name.startsWith(".")) return false;
  if (file_name.endsWith(".map") || file_name.endsWith(".min.js")) return false;
  if (file_name.endsWith(".d.ts") || file_name.endsWith(".d.ts.map")) return false;
  return SOURCE_EXTS.has(extOf(file_name));
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
  package_name: string;
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
    const package_name =
      nameByPath.get(pkgJsonPath) ||
      (directory ? directory.split("/").pop()! : "(root)");
    roots.push({ package_name, directory });
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
  return { package_name: "(root)", directory: "" };
}

export function parsePackageName(packageJsonText: string): string | undefined {
  try {
    const parsed = JSON.parse(packageJsonText) as { name?: unknown };
    return typeof parsed.name === "string" ? parsed.name : undefined;
  } catch {
    return undefined;
  }
}

/**
 * `@scope/pkg/requests/orgs/list` → SDK package + request stem.
 * Returns null when the specifier is not a `requests/` subpath import.
 */
export function sdkRequestFromSpecifier(specifier: string): {
  sdkPackageName: string;
  requestStem: string;
} | null {
  const m = /^((?:@[^/]+\/)?[^/]+)\/requests\/(.+)$/.exec(specifier);
  if (!m) return null;
  const requestStem = m[2]!.replace(/\.(tsx?|jsx?|mjs|cjs)$/, "");
  return { sdkPackageName: m[1]!, requestStem };
}
