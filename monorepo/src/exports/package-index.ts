import fs from "node:fs";
import path from "node:path";
import {
  matchExportPattern,
  sortExportPatternKeys,
} from "./match-export-pattern.ts";

export { matchExportPattern, sortExportPatternKeys } from "./match-export-pattern.ts";

/** Package metadata indexed by workspace package name. */
export interface PackageInfo {
  dir: string;
  exports: unknown;
}

/** Index of workspace packages discovered under a monorepo root. */
export type PackageIndex = Map<string, PackageInfo>;

const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "coverage"]);

/**
 * Walk up from `fromDir` until a package.json with a `workspaces` field is found.
 */
export function findMonorepoRoot(fromDir: string): string {
  let dir = path.resolve(fromDir);
  for (;;) {
    const pjPath = path.join(dir, "package.json");
    try {
      const pj = JSON.parse(fs.readFileSync(pjPath, "utf8")) as {
        workspaces?: unknown;
      };
      if (pj.workspaces) return dir;
    } catch {
      // keep walking
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      throw new Error(`Could not find monorepo root from ${fromDir}`);
    }
    dir = parent;
  }
}

function scanPackageDirs(dir: string, depth = 0, out: string[] = []): string[] {
  if (depth > 6) return out;
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  if (entries.some((e) => e.name === "package.json" && e.isFile())) {
    out.push(dir);
  }
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    if (SKIP_DIRS.has(e.name)) continue;
    scanPackageDirs(path.join(dir, e.name), depth + 1, out);
  }
  return out;
}

/**
 * Build a map of workspace package name → { dir, exports }.
 */
export function buildPackageIndex(root: string): PackageIndex {
  const index: PackageIndex = new Map();
  for (const dir of scanPackageDirs(root)) {
    try {
      const pj = JSON.parse(
        fs.readFileSync(path.join(dir, "package.json"), "utf8"),
      ) as { name?: string; exports?: unknown };
      if (pj.name) {
        index.set(pj.name, { dir, exports: pj.exports });
      }
    } catch {
      // skip invalid package.json
    }
  }
  return index;
}

function resolveExportTarget(pkg: PackageInfo, subpath: string): string | null {
  const exp = pkg.exports;
  const key = subpath === "" ? "." : "./" + subpath;
  if (!exp) return null;
  if (typeof exp === "string") {
    return key === "." ? path.join(pkg.dir, exp) : null;
  }
  if (typeof exp !== "object" || exp === null) return null;
  const map = exp as Record<string, unknown>;
  const target = map[key];
  if (typeof target === "string") return path.join(pkg.dir, target);
  if (target && typeof target === "object") {
    const cond = target as Record<string, unknown>;
    const t = cond.import ?? cond.default ?? cond.node;
    if (typeof t === "string") return path.join(pkg.dir, t);
  }

  const patternKeys = sortExportPatternKeys(
    Object.keys(map).filter((k) => k.includes("*")),
  );
  for (const patternKey of patternKeys) {
    const patternTarget = map[patternKey];
    if (typeof patternTarget !== "string") continue;
    const substituted = matchExportPattern(key, patternKey, patternTarget);
    if (substituted) return path.join(pkg.dir, substituted);
  }
  return null;
}

/** Resolve a package export subpath to an absolute file path (no extension probing). */
export function resolvePackageExportPath(
  pkg: PackageInfo,
  subpath: string,
): string | null {
  return resolveExportTarget(pkg, subpath);
}

/** Resolve a path candidate with common TS/Vue extensions and index files. */
export function existsResolve(p: string): string | null {
  const candidates = [
    p,
    p + ".ts",
    p + ".tsx",
    p + ".vue",
    p + ".js",
    path.join(p, "index.ts"),
    path.join(p, "index.tsx"),
    path.join(p, "index.js"),
  ];
  for (const c of candidates) {
    try {
      if (fs.statSync(c).isFile()) return c;
    } catch {
      // try next
    }
  }
  return null;
}

export type ResolveResult =
  | { kind: "file"; path: string }
  | { kind: "external"; root: string }
  | null;

/** npm package root for a bare specifier (`stripe`, `@scope/pkg`). */
export function externalRoot(spec: string): string {
  if (spec.startsWith("@")) {
    return spec.split("/").slice(0, 2).join("/");
  }
  return spec.split("/")[0]!;
}

/**
 * Resolve an import specifier relative to `fromFile` against the package index.
 */
export function resolveSpecifier(
  spec: string,
  fromFile: string,
  index: PackageIndex,
): ResolveResult {
  if (spec.startsWith(".")) {
    const resolved = existsResolve(path.resolve(path.dirname(fromFile), spec));
    return resolved ? { kind: "file", path: resolved } : null;
  }

  const names = [...index.keys()].sort((a, b) => b.length - a.length);
  for (const name of names) {
    if (spec === name || spec.startsWith(name + "/")) {
      const pkg = index.get(name)!;
      const sub = spec === name ? "" : spec.slice(name.length + 1);
      const exportPath = resolvePackageExportPath(pkg, sub);
      if (exportPath) {
        const resolved = existsResolve(exportPath);
        if (resolved) return { kind: "file", path: resolved };
      }
      return null;
    }
  }

  return { kind: "external", root: externalRoot(spec) };
}
