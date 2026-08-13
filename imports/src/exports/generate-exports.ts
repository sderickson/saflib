import fs from "node:fs";
import path from "node:path";
import {
  buildPackageIndex,
  existsResolve,
  findMonorepoRoot,
  resolvePackageExportPath,
} from "../resolve/index.ts";
import type { PackageInfo } from "../types.ts";

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "coverage",
  "fixtures",
  "bin",
  "docs",
  "workflows",
  "testing",
]);

const WORKFLOW_AREA_RE = /BEGIN\s+(?:ONCE\s+)?(?:SORTED\s+)?WORKFLOW AREA/;

/** Package-local files excluded from generated export maps (internal wiring). */
const SKIP_FILES = new Set([
  "env.ts",
  "schema.ts",
  "drizzle.config.ts",
  "instances-registry.ts",
]);

export type ExportsMap = Record<string, string>;

export interface ComputeExportsOptions {
  /** Package directory (absolute). */
  pkgDir: string;
}

export interface CheckExportsResult {
  ok: boolean;
  expected: ExportsMap;
  actual: ExportsMap;
  /** Human-readable mismatch lines. */
  diffs: string[];
  /** True when package.json contains WORKFLOW AREA markers (M0: generate refuses). */
  hasWorkflowMarkers: boolean;
}

function isExportableTs(name: string): boolean {
  if (!name.endsWith(".ts") && !name.endsWith(".tsx")) return false;
  if (name.endsWith(".d.ts")) return false;
  if (/\.(test|spec)\.(ts|tsx)$/.test(name)) return false;
  return true;
}

function walkExportableFiles(dir: string, out: string[]) {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (e.name.startsWith(".")) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      walkExportableFiles(full, out);
    } else if (
      e.isFile() &&
      isExportableTs(e.name) &&
      !SKIP_FILES.has(e.name)
    ) {
      out.push(full);
    }
  }
}

/**
 * List exportable source files: all `.ts`/`.tsx` under the package directory
 * (recursive). Excludes tests, fixtures, bin, docs, workflows, and `env.ts`.
 */
export function listExportableFiles(pkgDir: string): string[] {
  const out: string[] = [];
  walkExportableFiles(pkgDir, out);
  return out.sort();
}

function readExportsAliases(pkgDir: string): ExportsMap {
  try {
    const pj = JSON.parse(
      fs.readFileSync(path.join(pkgDir, "package.json"), "utf8"),
    ) as { exportsAliases?: ExportsMap };
    return sortExportsMap(pj.exportsAliases ?? {});
  } catch {
    return {};
  }
}

/** True if package.json text contains a WORKFLOW AREA marker. */
export function packageHasWorkflowMarkers(pkgDir: string): boolean {
  try {
    const text = fs.readFileSync(path.join(pkgDir, "package.json"), "utf8");
    return WORKFLOW_AREA_RE.test(text);
  } catch {
    return false;
  }
}

/**
 * Compute the heuristic `exports` map for a package.
 * `index.ts` in a directory maps to `./<dir>` (or `.` at package root).
 */
export function computeExportsMap(pkgDir: string): ExportsMap {
  const files = listExportableFiles(pkgDir);
  const map: ExportsMap = {};

  for (const abs of files) {
    const rel = path.relative(pkgDir, abs).split(path.sep).join("/");
    const withoutExt = rel.replace(/\.(ts|tsx)$/, "");
    let exportKey: string;
    if (withoutExt === "index") {
      exportKey = ".";
    } else {
      // Keep `/index` for nested barrels so imports are explicit
      // Prefer leaf query paths (`@scope/pkg/queries/foo/create`) that match
      // `./queries/*` → `./queries/*.ts`. Do not emit group `index` barrels.
      exportKey = "./" + withoutExt;
    }
    map[exportKey] = "./" + rel;
  }

  return sortExportsMap({ ...map, ...readExportsAliases(pkgDir) });
}

export function sortExportsMap(map: ExportsMap): ExportsMap {
  const keys = Object.keys(map).sort((a, b) => {
    if (a === ".") return -1;
    if (b === ".") return 1;
    return a.localeCompare(b);
  });
  const out: ExportsMap = {};
  for (const k of keys) out[k] = map[k]!;
  return out;
}

function exportsHasPatterns(map: ExportsMap): boolean {
  return Object.keys(map).some((k) => k.includes("*"));
}

/** Node subpath exports allow only one `*` per pattern key and target. */
function invalidMultiStarPatternDiffs(map: ExportsMap): string[] {
  const diffs: string[] = [];
  for (const [key, value] of Object.entries(map)) {
    const keyStars = (key.match(/\*/g) ?? []).length;
    if (keyStars > 1) {
      diffs.push(
        `invalid pattern key: ${key} (${keyStars} '*' — Node allows one '*' per key; that '*' may match nested path segments)`,
      );
    }
    const valStars = (value.match(/\*/g) ?? []).length;
    if (valStars > 1) {
      diffs.push(
        `invalid pattern target: ${key} → ${value} (${valStars} '*' in target)`,
      );
    }
  }
  return diffs;
}

function readActualExports(pkgDir: string): ExportsMap {
  const pj = JSON.parse(
    fs.readFileSync(path.join(pkgDir, "package.json"), "utf8"),
  ) as { exports?: unknown };
  const exp = pj.exports;
  if (!exp || typeof exp !== "object") return {};
  const out: ExportsMap = {};
  for (const [k, v] of Object.entries(exp as Record<string, unknown>)) {
    if (typeof v === "string") {
      out[k] = v;
    } else if (v && typeof v === "object") {
      const cond = v as Record<string, unknown>;
      const t = cond.import ?? cond.default ?? cond.node;
      if (typeof t === "string") out[k] = t;
    }
  }
  return sortExportsMap(out);
}

function resolveExportSubpath(pkg: PackageInfo, subpath: string): string | null {
  return resolvePackageExportPath(pkg, subpath);
}

/**
 * Verify export patterns cover every exportable file (hybrid / wildcard maps).
 */
export function checkExportPatternCoverage(pkgDir: string): CheckExportsResult {
  const expected = computeExportsMap(pkgDir);
  const actual = readActualExports(pkgDir);
  const aliases = readExportsAliases(pkgDir);
  const hasWorkflowMarkers = packageHasWorkflowMarkers(pkgDir);
  const pkg: PackageInfo = {
    dir: pkgDir,
    exports: sortExportsMap({ ...actual, ...aliases }),
  };
  const diffs: string[] = [
    ...invalidMultiStarPatternDiffs(actual),
    ...invalidMultiStarPatternDiffs(aliases),
  ];

  for (const [key, relTarget] of Object.entries(expected)) {
    const subpath = key === "." ? "" : key.slice(2);
    const exportPath = resolveExportSubpath(pkg, subpath);
    if (!exportPath) {
      diffs.push(`uncovered: ${key} → ${relTarget}`);
      continue;
    }
    const resolved = existsResolve(exportPath);
    if (!resolved) {
      diffs.push(`unresolvable: ${key} → ${exportPath}`);
      continue;
    }
    const expectedAbs = path.join(pkgDir, relTarget.replace(/^\.\//, ""));
    if (path.normalize(resolved) !== path.normalize(expectedAbs)) {
      diffs.push(
        `wrong target: ${key} → ${path.relative(pkgDir, resolved)} (expected ${relTarget})`,
      );
    }
  }

  return {
    ok: diffs.length === 0,
    expected,
    actual,
    diffs,
    hasWorkflowMarkers,
  };
}

/**
 * Diff generated exports against committed `package.json` exports.
 * Packages with wildcard export keys use pattern coverage validation instead.
 */
export function checkExports(pkgDir: string): CheckExportsResult {
  const expected = computeExportsMap(pkgDir);
  const actual = readActualExports(pkgDir);
  const aliases = readExportsAliases(pkgDir);
  const hasWorkflowMarkers = packageHasWorkflowMarkers(pkgDir);

  if (exportsHasPatterns(actual) || exportsHasPatterns(aliases)) {
    return checkExportPatternCoverage(pkgDir);
  }

  const diffs: string[] = [];
  const allKeys = new Set([...Object.keys(expected), ...Object.keys(actual)]);
  for (const key of [...allKeys].sort()) {
    const e = expected[key];
    const a = actual[key];
    if (e === undefined) {
      diffs.push(`extra: ${key} → ${a}`);
    } else if (a === undefined) {
      diffs.push(`missing: ${key} → ${e}`);
    } else if (e !== a) {
      diffs.push(`mismatch: ${key} expected ${e}, got ${a}`);
    }
  }

  return {
    ok: diffs.length === 0,
    expected,
    actual,
    diffs,
    hasWorkflowMarkers,
  };
}

/**
 * Write computed exports into package.json.
 * Refuses if WORKFLOW AREA markers are present (M0 limitation).
 */
export function generateExports(pkgDir: string): {
  written: boolean;
  exports: ExportsMap;
  error?: string;
} {
  if (packageHasWorkflowMarkers(pkgDir)) {
    return {
      written: false,
      exports: {},
      error:
        "Refusing to generate: package.json contains WORKFLOW AREA markers (not supported in M0)",
    };
  }

  const pjPath = path.join(pkgDir, "package.json");
  const pj = JSON.parse(fs.readFileSync(pjPath, "utf8")) as Record<
    string,
    unknown
  >;
  const exportsAliases = readExportsAliases(pkgDir);
  const exports = computeExportsMap(pkgDir);
  pj.exports = exports;
  if (Object.keys(exportsAliases).length > 0) {
    pj.exportsAliases = exportsAliases;
  }
  fs.writeFileSync(pjPath, JSON.stringify(pj, null, 2) + "\n", "utf8");
  return { written: true, exports };
}

/** Resolve a workspace package name to its directory. */
export function resolvePackageDir(
  packageName: string,
  root?: string,
): { dir: string; error?: string } {
  const monorepoRoot = root ?? findMonorepoRoot(process.cwd());
  const index = buildPackageIndex(monorepoRoot);
  const pkg = index.get(packageName);
  if (!pkg) {
    return { dir: "", error: `Unknown workspace package: ${packageName}` };
  }
  return { dir: pkg.dir };
}
