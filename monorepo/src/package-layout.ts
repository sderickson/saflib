/**
 * Package layout + oversized-file checks (npm package as monorepo unit).
 */
import fs from "node:fs";
import path from "node:path";

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
export interface PackageJsonLayoutFields {
  bin?: Record<string, string> | string;
  scripts?: Record<string, string>;
}

export interface CheckPackageLayoutFromInputsOptions {
  packageJson: PackageJsonLayoutFields;
  /** Basename used when `bin` is a string (defaults to `"package"`). */
  packageDirBasename?: string;
  /** Repo-relative package directory for repoPath (optional). */
  packageRepoPath?: string;
  /** Filenames of .ts/.tsx at package root (not nested). */
  rootTsFiles?: string[];
  /** Prod source files with line counts (package-local paths). */
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

function isTestOrFixtureFileName(name: string): boolean {
  return (
    /\.(test|spec)\.(ts|tsx)$/.test(name) || /\.fixtures\.(ts|tsx)$/.test(name)
  );
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
      (e.name.endsWith(".ts") || e.name.endsWith(".tsx")) &&
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
      issues.push({
        kind: "package-layout",
        title: "Package layout",
        name: `scripts.${scriptName} uses node --experimental-strip-types (use saf-ts-run)`,
        kindLabel: "scripts",
        filePath: "package.json",
        repoPath: repoPathFor("package.json"),
      });
    }
    if (usesSafTsRun(script)) {
      const target = scriptTargetPath(script);
      if (target && !isUnderScripts(target) && !isUnderBin(target)) {
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
      // drizzle-kit requires this file at the package root
      name !== "drizzle.config.ts"
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
