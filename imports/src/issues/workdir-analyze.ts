/**
 * Working-tree package issue analysis — shared by `saf-analyze-package` and
 * `saf-dev-site issues --workdir`.
 */
import { readFileSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { checkPackageLayout } from "@saflib/monorepo";
import {
  checkExports,
  collectPublicExportRepoPaths,
} from "@saflib/monorepo/exports";
import { assembleUsedBy } from "../graph/assemble-used-by.ts";
import { exportUsedByKey } from "../graph/import-resolution.ts";
import {
  buildFileSpecialty,
  type FileSpecialty,
} from "../facts/index.ts";
import {
  buildPackageIndex,
  existsResolve,
  resolveSpecifier,
} from "../resolve/index.ts";
import type { PackageIndex } from "../types.ts";
import { resolveImportsMapSpecifier } from "../graph/tree-import-resolution.ts";
import {
  collectPackageIssues,
  type PackageIssue,
} from "./package-issues.ts";
import {
  isGraphSourcePath,
  isScaffoldTemplatePath,
  isTestSourcePath,
} from "./source-paths.ts";
import type { UsedByImporterUnit } from "../graph/assemble-used-by.ts";

export {
  isGraphSourcePath,
  isScaffoldTemplatePath,
  isTestSourcePath,
} from "./source-paths.ts";

const WALK_EXCLUDE_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "coverage",
  "docs",
  "fixtures",
]);

export interface WorkdirAnalyzeOptions {
  /** Absolute monorepo root. */
  monorepoRoot: string;
  /** Repo-relative prefix limiting the file walk (e.g. `saflib/base`). */
  productRoot?: string;
  /** Analyze only these workspace package names (empty = none). */
  packageNames?: string[];
  /**
   * When set, analyze every workspace package whose name contains this
   * substring (applied after `packageNames`, if any).
   */
  packageNameMatch?: string;
  /** Include `checkPackageLayout` findings (default true). */
  includeLayout?: boolean;
  /** Include `checkExports` diffs as layout issues (default false). */
  includeExportsCheck?: boolean;
}

export interface WorkdirPackageAnalyzeResult {
  packageName: string;
  packageDir: string;
  packageRepoPath: string;
  issues: PackageIssue[];
  exportCount: number;
}

export interface WorkdirAnalyzeResult {
  productRoot: string;
  packages: WorkdirPackageAnalyzeResult[];
}

export interface WorkdirGraphContext {
  monorepoRoot: string;
  productRoot: string;
  index: PackageIndex;
  packageRoots: Array<{
    packageName: string;
    directory: string;
    packageDir: string;
  }>;
  specialtyByPath: Map<string, FileSpecialty>;
}

function readPackageImportsMap(
  packageDir: string,
): Record<string, string> | undefined {
  try {
    const pj = JSON.parse(
      readFileSync(path.join(packageDir, "package.json"), "utf8"),
    ) as { imports?: Record<string, string> };
    return pj.imports;
  } catch {
    return undefined;
  }
}

function packageForRepoPath(
  repoPath: string,
  roots: Array<{ packageName: string; directory: string }>,
): { packageName: string; directory: string } {
  let best: { packageName: string; directory: string } | null = null;
  for (const r of roots) {
    const d = r.directory;
    if (!d) {
      if (!best) best = r;
      continue;
    }
    if (repoPath === d || repoPath.startsWith(`${d}/`)) {
      if (!best || d.length >= best.directory.length) best = r;
    }
  }
  return best ?? { packageName: "(unknown)", directory: "" };
}

async function walkRepoFiles(
  absDir: string,
  relDir: string,
): Promise<string[]> {
  const out: string[] = [];
  let entries;
  try {
    entries = await readdir(absDir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (e.name.startsWith(".")) continue;
    if (WALK_EXCLUDE_DIRS.has(e.name)) continue;
    const rel = relDir ? `${relDir}/${e.name}` : e.name;
    const abs = path.join(absDir, e.name);
    if (e.isDirectory()) out.push(...(await walkRepoFiles(abs, rel)));
    else if (e.isFile()) out.push(rel.replace(/\\/g, "/"));
  }
  return out;
}

function underProductRoot(repoPath: string, productRoot: string): boolean {
  if (!productRoot) return true;
  return repoPath === productRoot || repoPath.startsWith(`${productRoot}/`);
}

function sortIssues(issues: PackageIssue[]): PackageIssue[] {
  return [...issues].sort(
    (a, b) =>
      a.filePath.localeCompare(b.filePath) || a.name.localeCompare(b.name),
  );
}

/**
 * Walk the tree once and build import/export specialties for graph analysis.
 */
export async function buildWorkdirGraphContext(
  options: Pick<WorkdirAnalyzeOptions, "monorepoRoot" | "productRoot">,
): Promise<WorkdirGraphContext> {
  const monorepoRoot = options.monorepoRoot;
  const productRoot = (options.productRoot ?? "").replace(/^\/+|\/+$/g, "");

  const index = buildPackageIndex(monorepoRoot);
  const packageRoots = [...index.entries()]
    .map(([packageName, info]) => ({
      packageName,
      directory: path
        .relative(monorepoRoot, info.dir)
        .split(path.sep)
        .join("/"),
      packageDir: info.dir,
    }))
    .sort((a, b) => b.directory.length - a.directory.length);

  const walkRoot = productRoot
    ? path.join(monorepoRoot, productRoot)
    : monorepoRoot;
  const allFiles = await walkRepoFiles(walkRoot, productRoot);
  const treePaths = allFiles.filter((p) => underProductRoot(p, productRoot));

  const specialtyByPath = new Map<string, FileSpecialty>();
  for (const rel of treePaths) {
    if (!isGraphSourcePath(rel)) continue;
    const text = await readFile(path.join(monorepoRoot, rel), "utf8");
    specialtyByPath.set(rel, buildFileSpecialty(text));
  }

  return {
    monorepoRoot,
    productRoot,
    index,
    packageRoots,
    specialtyByPath,
  };
}

function resolveTargetPackages(
  ctx: WorkdirGraphContext,
  options: WorkdirAnalyzeOptions,
): WorkdirGraphContext["packageRoots"] {
  let targets = ctx.packageRoots;

  if (options.packageNames?.length) {
    const wanted = new Set(options.packageNames);
    targets = targets.filter((p) => wanted.has(p.packageName));
  }

  if (options.packageNameMatch) {
    const needle = options.packageNameMatch;
    targets = targets.filter((p) => p.packageName.includes(needle));
  }

  return targets.sort((a, b) => a.packageName.localeCompare(b.packageName));
}

/**
 * Analyze one package from a pre-built {@link WorkdirGraphContext}.
 */
export function analyzePackageFromWorkdirContext(
  ctx: WorkdirGraphContext,
  target: WorkdirGraphContext["packageRoots"][number],
  options: Pick<
    WorkdirAnalyzeOptions,
    "includeLayout" | "includeExportsCheck"
  > = {},
): WorkdirPackageAnalyzeResult {
  const includeLayout = options.includeLayout !== false;
  const includeExportsCheck = options.includeExportsCheck === true;
  const { monorepoRoot, productRoot, index, specialtyByPath, packageRoots } =
    ctx;
  const packageName = target.packageName;
  const packageRepoPath = target.directory;
  const packageDir = target.packageDir;

  const issues: PackageIssue[] = [];

  if (includeLayout) {
    for (const i of checkPackageLayout({
      packageDir,
      packageRepoPath,
    })) {
      issues.push({ ...i });
    }
  }

  if (includeExportsCheck) {
    const exportsCheck = checkExports(packageDir);
    if (!exportsCheck.ok) {
      for (const d of exportsCheck.diffs) {
        issues.push({
          kind: "package-layout",
          title: "Exports",
          name: d,
          kindLabel: "exports",
          filePath: "package.json",
          repoPath: packageRepoPath
            ? `${packageRepoPath}/package.json`
            : "package.json",
        });
      }
    }
  }

  const importsMap = readPackageImportsMap(packageDir);
  const publicExportFilePaths = collectPublicExportRepoPaths(
    packageDir,
    packageRepoPath,
  );

  const underPkg = (rel: string) => {
    if (!packageRepoPath) return true;
    return rel === packageRepoPath || rel.startsWith(`${packageRepoPath}/`);
  };

  const exports: Array<{ filePath: string; name: string; kind: string }> = [];
  for (const [rel, specialty] of specialtyByPath) {
    if (!underPkg(rel) || isTestSourcePath(rel) || isScaffoldTemplatePath(rel)) {
      continue;
    }
    for (const exp of specialty.exports) {
      exports.push({ filePath: rel, name: exp.name, kind: exp.kind });
    }
  }

  const roots = packageRoots.map((p) => ({
    packageName: p.packageName,
    directory: p.directory,
  }));

  const importers: UsedByImporterUnit[] = [];
  for (const [rel, specialty] of specialtyByPath) {
    const root = packageForRepoPath(rel, roots);
    importers.push({
      path: rel,
      packageName: root.packageName,
      packageDirectory: root.directory,
      isTest: isTestSourcePath(rel),
      imports: specialty.imports,
      localExportUsages: specialty.localExportUsages,
    });
  }

  const resolveImportTarget = (
    importerPath: string,
    specifier: string,
  ): string | null => {
    if (specifier.startsWith("#") && importsMap) {
      const mapped = resolveImportsMapSpecifier(specifier, importsMap);
      if (mapped) {
        const resolved = existsResolve(path.resolve(packageDir, mapped));
        if (resolved) {
          return path
            .relative(monorepoRoot, resolved)
            .split(path.sep)
            .join("/");
        }
      }
    }

    const resolved = resolveSpecifier(
      specifier,
      path.join(monorepoRoot, importerPath),
      index,
    );
    if (resolved?.kind === "file") {
      return path
        .relative(monorepoRoot, resolved.path)
        .split(path.sep)
        .join("/");
    }
    return null;
  };

  const usedBy = assembleUsedBy(
    packageName,
    packageRepoPath,
    exports,
    importers,
    { resolveImportTarget },
  );

  issues.push(
    ...collectPackageIssues(
      {
        packageName,
        directory: packageRepoPath,
        publicExportFilePaths,
        exports: exports.map((e) => ({
          name: e.name,
          kind: e.kind,
          filePath: e.filePath,
          usedBy: usedBy.get(exportUsedByKey(e.filePath, e.name)) ?? [],
        })),
      },
      { packageDirectory: packageRepoPath, productRoot },
    ),
  );

  return {
    packageName,
    packageDir,
    packageRepoPath,
    issues: sortIssues(issues),
    exportCount: exports.length,
  };
}

/**
 * Analyze one or more packages from the working tree.
 */
export async function analyzeWorkdirPackages(
  options: WorkdirAnalyzeOptions,
): Promise<WorkdirAnalyzeResult> {
  const productRoot = (options.productRoot ?? "").replace(/^\/+|\/+$/g, "");
  const ctx = await buildWorkdirGraphContext({
    monorepoRoot: options.monorepoRoot,
    productRoot,
  });
  const targets = resolveTargetPackages(ctx, options);

  const packages = targets.map((target) =>
    analyzePackageFromWorkdirContext(ctx, target, {
      includeLayout: options.includeLayout,
      includeExportsCheck: options.includeExportsCheck,
    }),
  );

  return { productRoot, packages };
}

/**
 * Analyze a single package from the working tree.
 */
export async function analyzeWorkdirPackage(
  options: WorkdirAnalyzeOptions & { packageName: string },
): Promise<WorkdirPackageAnalyzeResult | null> {
  const result = await analyzeWorkdirPackages({
    ...options,
    packageNames: [options.packageName],
  });
  return result.packages[0] ?? null;
}
