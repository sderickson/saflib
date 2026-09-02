/**
 * Package layout + oversized-file checks (npm package as monorepo unit).
 */
import fs from "node:fs";
import path from "node:path";
import {
  classifySafPackage,
  type SafPackageJson,
} from "./package-kind.ts";

export const DEFAULT_MAX_SOURCE_LINES = 800;

export type PackageLayoutIssueKind = "package-layout" | "oversized-file";

export interface PackageLayoutIssue {
  kind: PackageLayoutIssueKind;
  title: string;
  name: string;
  kindLabel: string;
  /** Package-local path (or `package.json`). */
  filePath: string;
  repoPath: string;
}

export interface CheckPackageLayoutOptions {
  /** Absolute package directory. */
  packageDir: string;
  /** Repo-relative package directory for repoPath (optional). */
  packageRepoPath?: string;
  maxSourceLines?: number;
}

/** In-memory package.json fields used by layout checks. */
export interface PackageJsonLayoutFields extends SafPackageJson {
  bin?: Record<string, string> | string;
  scripts?: Record<string, string>;
  /** Subpath exports map (`"./foo": "./foo.ts"`). */
  exports?: Record<string, unknown>;
  /** Package-local `#` imports map (`"#foo.ts": "./foo.ts"`). */
  imports?: Record<string, unknown>;
}

export interface CheckPackageLayoutFromInputsOptions {
  packageJson: PackageJsonLayoutFields;
  /** Basename used when `bin` is a string (defaults to `"package"`). */
  packageDirBasename?: string;
  /** Repo-relative package directory for repoPath (optional). */
  packageRepoPath?: string;
  /** Filenames of .ts/.tsx at package root (not nested). */
  rootTsFiles?: string[];
  /** Prod source files with line counts (package-local paths; `.ts`/`.tsx`/`.yaml`/`.yml`). */
  sourceFiles?: Array<{ localPath: string; lineCount: number }>;
  maxSourceLines?: number;
}

function readPackageJson(pkgDir: string): PackageJsonLayoutFields {
  const text = fs.readFileSync(path.join(pkgDir, "package.json"), "utf8");
  return JSON.parse(text) as PackageJsonLayoutFields;
}

function isUnderBin(rel: string): boolean {
  const n = rel.replace(/^\.\//, "").replace(/\\/g, "/");
  return n === "bin" || n.startsWith("bin/");
}

function isUnderScripts(rel: string): boolean {
  const n = rel.replace(/^\.\//, "").replace(/\\/g, "/");
  return n === "scripts" || n.startsWith("scripts/");
}

/** Monolith / service process entrypoints that may be started via saf-ts-run. */
function isAllowedSafTsRunTarget(rel: string): boolean {
  const n = rel.replace(/^\.\//, "").replace(/\\/g, "/");
  return isUnderScripts(rel) || isUnderBin(rel) || n === "run.ts";
}

/** Extract a path-like token after saf-ts-run or node strip-types. */
function scriptTargetPath(script: string): string | null {
  const saf = script.match(/saf-ts-run\s+(\S+)/);
  if (saf) return saf[1]!.replace(/^['"]|['"]$/g, "");
  const node = script.match(
    /node\s+--experimental-strip-types(?:\s+--disable-warning=ExperimentalWarning)?\s+(\S+)/,
  );
  if (node) return node[1]!.replace(/^['"]|['"]$/g, "");
  return null;
}

function usesStripTypesDirectly(script: string): boolean {
  return /node\s+--experimental-strip-types/.test(script);
}

function usesSafTsRun(script: string): boolean {
  return /\bsaf-ts-run\b/.test(script);
}

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "coverage",
  "docs",
  "fixtures",
  "workflows",
]);

/**
 * `.ts` / `.tsx` basenames always allowed at the package root.
 * Everything else should live in a thematic folder — unless it is a
 * direct package export target (see {@link isAllowedRootTsFile}).
 */
export const ROOT_TS_ALLOWLIST = new Set([
  /** drizzle-kit requires this at the package root */
  "drizzle.config.ts",
  /** drizzle-kit schema barrel (`schema: "./schema.ts"` in drizzle.config) */
  "schema.ts",
  /** Package entry / re-export surface */
  "index.ts",
  "index.tsx",
  /** SDK (and similar) HTTP client entry — one file, public `./client` export */
  "client.ts",
  /** Vue SPA boot (see `@saflib/vue` package structure) */
  "main.ts",
  "router.ts",
  /** Tooling configs that Vite / Vitest / Playwright resolve from the package root */
  "vite.config.ts",
  "vitest.config.ts",
  "vitest.config.js",
  "playwright.config.ts",
  /** Monolith / service process entry (`saf-ts-run ./run.ts`) */
  "run.ts",
]);

function exportTargetPath(target: unknown): string | null {
  if (typeof target === "string") return target.replace(/^\.\//, "");
  if (target && typeof target === "object" && !Array.isArray(target)) {
    const rec = target as Record<string, unknown>;
    for (const key of ["default", "import", "require", "module", "node"]) {
      const inner = exportTargetPath(rec[key]);
      if (inner) return inner;
    }
  }
  return null;
}

/**
 * Concrete `package.json` `exports` file targets (`main.ts`, `test-app.ts`).
 * Skips glob remaps (`./foo/*`).
 */
export function listPackageJsonExportTargetFiles(
  exportsMap?: Record<string, unknown> | string,
): string[] {
  if (exportsMap == null) return [];
  const values =
    typeof exportsMap === "string" ? [exportsMap] : Object.values(exportsMap);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const target of values) {
    const rel = exportTargetPath(target);
    if (!rel || rel.includes("*")) continue;
    if (seen.has(rel)) continue;
    seen.add(rel);
    out.push(rel);
  }
  return out;
}

/**
 * Root source file is allowed when allowlisted, or when `package.json`
 * exports it (`"."` → `./main.ts`, or `./<stem>` → `./<stem>.ts`).
 */
export function isAllowedRootTsFile(
  fileName: string,
  exportsMap?: Record<string, unknown>,
): boolean {
  if (ROOT_TS_ALLOWLIST.has(fileName)) return true;
  if (!fileName.endsWith(".ts") && !fileName.endsWith(".tsx")) return false;
  if (fileName.endsWith(".d.ts")) return false;
  if (isTestOrFixtureFileName(fileName)) return false;
  if (!exportsMap) return false;
  if (exportTargetPath(exportsMap["."]) === fileName) return true;
  const stem = fileName.replace(/\.tsx?$/, "");
  const target = exportTargetPath(exportsMap[`./${stem}`]);
  return target === fileName;
}

function isTestOrFixtureFileName(name: string): boolean {
  return (
    /\.(test|spec)\.(ts|tsx)$/.test(name) ||
    /\.fixtures?\.(ts|tsx)$/.test(name) ||
    /\.test-helpers\.(ts|tsx)$/.test(name)
  );
}

/**
 * `*-links` packages keep link modules at the package root by convention.
 */
export function isLinksPackageRootTsFile(
  fileName: string,
  packageName?: string,
): boolean {
  if (!packageName?.endsWith("-links")) return false;
  if (!fileName.endsWith(".ts") && !fileName.endsWith(".tsx")) return false;
  if (fileName.endsWith(".d.ts")) return false;
  return !isTestOrFixtureFileName(fileName);
}

/**
 * Root `foo.test.ts` colocated with root `foo.ts` (same stem, not `index`).
 */
export function isColocatedRootTestFile(
  fileName: string,
  rootTsFiles: readonly string[],
): boolean {
  const match = fileName.match(/^(.+)\.(test|spec)\.(ts|tsx)$/);
  if (!match) return false;
  const stem = match[1]!;
  if (stem === "index") return false;
  return rootTsFiles.includes(`${stem}.ts`) || rootTsFiles.includes(`${stem}.tsx`);
}

function walkSourceFiles(dir: string, out: string[]) {
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
      walkSourceFiles(full, out);
    } else if (
      e.isFile() &&
      (e.name.endsWith(".ts") ||
        e.name.endsWith(".tsx") ||
        e.name.endsWith(".yaml") ||
        e.name.endsWith(".yml")) &&
      !e.name.endsWith(".d.ts") &&
      !isTestOrFixtureFileName(e.name)
    ) {
      out.push(full);
    }
  }
}

function countLines(text: string): number {
  if (text.length === 0) return 0;
  let n = 0;
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) === 10) n++;
  }
  if (text.charCodeAt(text.length - 1) !== 10) n++;
  return n;
}

/**
 * Layout + oversized checks from already-loaded inputs (git commit / FS).
 */
export function checkPackageLayoutFromInputs(
  options: CheckPackageLayoutFromInputsOptions,
): PackageLayoutIssue[] {
  const repoBase = (options.packageRepoPath ?? "").replace(/\/+$/, "");
  const maxLines = options.maxSourceLines ?? DEFAULT_MAX_SOURCE_LINES;
  const issues: PackageLayoutIssue[] = [];
  const repoPathFor = (local: string) =>
    repoBase ? `${repoBase}/${local}` : local;

  const pj = options.packageJson;
  const basename = options.packageDirBasename ?? "package";

  const mixed = classifySafPackage(pj).mixedIdentifiers;
  if (mixed.length > 0) {
    issues.push({
      kind: "package-layout",
      title: "Package layout",
      name: `depends on multiple layer identifiers (${mixed.join(", ")}) — a package should be one of db, http, or spec`,
      kindLabel: "kind",
      filePath: "package.json",
      repoPath: repoPathFor("package.json"),
    });
  }

  const bins: Record<string, string> =
    typeof pj.bin === "string" ? { [basename]: pj.bin } : (pj.bin ?? {});

  for (const [name, target] of Object.entries(bins)) {
    const rel = target.replace(/^\.\//, "");
    if (!isUnderBin(rel)) {
      issues.push({
        kind: "package-layout",
        title: "Package layout",
        name: `bin.${name} → ${target} (must be under ./bin/)`,
        kindLabel: "bin",
        filePath: "package.json",
        repoPath: repoPathFor("package.json"),
      });
    }
  }

  for (const [scriptName, script] of Object.entries(pj.scripts ?? {})) {
    if (usesStripTypesDirectly(script) && !usesSafTsRun(script)) {
      const target = scriptTargetPath(script);
      if (!target || !isAllowedSafTsRunTarget(target)) {
        issues.push({
          kind: "package-layout",
          title: "Package layout",
          name: `scripts.${scriptName} uses node --experimental-strip-types (use saf-ts-run)`,
          kindLabel: "scripts",
          filePath: "package.json",
          repoPath: repoPathFor("package.json"),
        });
      }
    }
    if (usesSafTsRun(script)) {
      const target = scriptTargetPath(script);
      if (target && !isAllowedSafTsRunTarget(target)) {
        issues.push({
          kind: "package-layout",
          title: "Package layout",
          name: `scripts.${scriptName} → ${target} (saf-ts-run must target ./scripts/ or ./bin/)`,
          kindLabel: "scripts",
          filePath: "package.json",
          repoPath: repoPathFor("package.json"),
        });
      }
    }
  }

  for (const name of options.rootTsFiles ?? []) {
    if (
      (name.endsWith(".ts") || name.endsWith(".tsx")) &&
      !name.endsWith(".d.ts") &&
      !isAllowedRootTsFile(name, pj.exports) &&
      !isLinksPackageRootTsFile(name, pj.name) &&
      !isColocatedRootTestFile(name, options.rootTsFiles ?? [])
    ) {
      issues.push({
        kind: "package-layout",
        title: "Package layout",
        name: `${name} at package root (move into a thematic folder)`,
        kindLabel: "root",
        filePath: name,
        repoPath: repoPathFor(name),
      });
    }
  }

  for (const src of options.sourceFiles ?? []) {
    if (src.lineCount > maxLines) {
      issues.push({
        kind: "oversized-file",
        title: "Oversized file",
        name: `${src.localPath} (${src.lineCount} LoC > ${maxLines})`,
        kindLabel: "file",
        filePath: src.localPath,
        repoPath: repoPathFor(src.localPath),
      });
    }
  }

  issues.sort(
    (a, b) =>
      a.filePath.localeCompare(b.filePath) || a.name.localeCompare(b.name),
  );
  return issues;
}

/**
 * Check bin/scripts layout conventions, no root-level TS, and oversized files.
 */
export function checkPackageLayout(
  options: CheckPackageLayoutOptions,
): PackageLayoutIssue[] {
  const pkgDir = options.packageDir;
  let pj: PackageJsonLayoutFields;
  try {
    pj = readPackageJson(pkgDir);
  } catch {
    return [];
  }

  const rootTsFiles: string[] = [];
  try {
    for (const e of fs.readdirSync(pkgDir, { withFileTypes: true })) {
      if (!e.isFile()) continue;
      const name = e.name;
      if (
        (name.endsWith(".ts") || name.endsWith(".tsx")) &&
        !name.endsWith(".d.ts")
      ) {
        rootTsFiles.push(name);
      }
    }
  } catch {
    // ignore
  }

  const sources: string[] = [];
  walkSourceFiles(pkgDir, sources);
  const sourceFiles: Array<{ localPath: string; lineCount: number }> = [];
  for (const abs of sources) {
    const local = path.relative(pkgDir, abs).split(path.sep).join("/");
    let text: string;
    try {
      text = fs.readFileSync(abs, "utf8");
    } catch {
      continue;
    }
    sourceFiles.push({ localPath: local, lineCount: countLines(text) });
  }

  return checkPackageLayoutFromInputs({
    packageJson: pj,
    packageDirBasename: path.basename(pkgDir),
    packageRepoPath: options.packageRepoPath,
    rootTsFiles,
    sourceFiles,
    maxSourceLines: options.maxSourceLines,
  });
}
