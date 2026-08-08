import fs from "node:fs";
import path from "node:path";
import {
  buildPackageIndex,
  findMonorepoRoot,
} from "../resolve/index.ts";

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "coverage",
  "fixtures",
  "bin",
  "docs",
  "workflows",
]);

const WORKFLOW_AREA_RE = /BEGIN\s+(?:ONCE\s+)?(?:SORTED\s+)?WORKFLOW AREA/;

/** Package-local files excluded from generated export maps (internal wiring). */
const SKIP_FILES = new Set(["env.ts"]);

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
    } else if (withoutExt.endsWith("/index")) {
      exportKey = "./" + withoutExt.slice(0, -"/index".length);
    } else {
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

/**
 * Diff generated exports against committed `package.json` exports.
 */
export function checkExports(pkgDir: string): CheckExportsResult {
  const expected = computeExportsMap(pkgDir);
  const actual = readActualExports(pkgDir);
  const hasWorkflowMarkers = packageHasWorkflowMarkers(pkgDir);
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
