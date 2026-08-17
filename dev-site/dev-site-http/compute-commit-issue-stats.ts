/**
 * Compute per-package issue counts for a commit from git tree + blob_facts.
 * Layout/oversized use commit-scoped inputs (not the live working tree).
 */
import type { DbKey } from "@saflib/drizzle";
import type { ReturnsError } from "@saflib/monorepo";
import {
  checkPackageLayoutFromInputs,
  DEFAULT_MAX_SOURCE_LINES,
  type PackageJsonLayoutFields,
  type PackageLayoutIssue,
} from "@saflib/monorepo";
import type { GitCommandError } from "@saflib/git";
import { listTree, readBlobs } from "@saflib/git";
import {
  blobFactExports,
  blobFactImports,
  type InsertPackageIssueStatsParams,
  type InsertPackageMetricsParams,
} from "@saflib/dev-site-db/types";
import {
  assembleUsedBy,
  specialtyLocalExportUsages,
  type UsedByImporterUnit,
} from "@saflib/imports";
import {
  collectPackageIssues,
  countIssuesByKind,
  PACKAGE_ISSUE_KINDS,
  type PackageIssue,
} from "./package-issues.ts";
import {
  ensureBlobFacts,
  type AnalyzeCommitOptions,
} from "./analyze-commit.ts";
import {
  isScaffoldTemplatePath,
  isSourcePath,
  isTestSourcePath,
  packageForPath,
  packageRootsFromPackageJsonPaths,
  parsePackageName,
  looksLikeDbPackage,
} from "./classify.ts";
import { assemblePackageDbInventory } from "./assemble-package-db-inventory.ts";
import {
  exportUsedByKey,
  type ExportUsedBy,
} from "./assemble-export-used-by.ts";

function underProductRoot(path: string, productRoot: string): boolean {
  if (!productRoot) return true;
  return path === productRoot || path.startsWith(productRoot + "/");
}

function joinRepoPath(...parts: Array<string | undefined>): string {
  return parts
    .map((p) => (p ?? "").replace(/^\/+|\/+$/g, ""))
    .filter(Boolean)
    .join("/");
}

function packageLocalFromRepo(
  repoPath: string,
  packageRepoPath: string,
): string {
  if (!packageRepoPath) return repoPath;
  const prefix = packageRepoPath.endsWith("/")
    ? packageRepoPath
    : `${packageRepoPath}/`;
  if (repoPath === packageRepoPath) return ".";
  if (repoPath.startsWith(prefix)) return repoPath.slice(prefix.length);
  return repoPath;
}

function parsePackageJsonFields(text: string): PackageJsonLayoutFields | null {
  try {
    const parsed = JSON.parse(text) as PackageJsonLayoutFields;
    return {
      bin: parsed.bin,
      scripts: parsed.scripts,
    };
  } catch {
    return null;
  }
}

export interface ComputeCommitIssueStatsOptions extends AnalyzeCommitOptions {
  /**
   * Packages to score. When omitted, discovered from the commit tree
   * (same discovery as analyzeCommit). Prefer passing scan metrics.
   */
  packages?: Array<
    Pick<InsertPackageMetricsParams, "packageName" | "directory">
  >;
}

/**
 * Count issues by kind for every package at `commitHash`.
 * Returns sparse insert rows (only kinds with count > 0).
 */
export async function computeCommitIssueStats(
  dbKey: DbKey,
  commitHash: string,
  options: ComputeCommitIssueStatsOptions,
): Promise<
  ReturnsError<Omit<InsertPackageIssueStatsParams, "commitHash">[], GitCommandError>
> {
  const repoRoot = options.repoRoot;
  const productRoot = (options.productRoot ?? "").replace(/^\/+|\/+$/g, "");

  const treeResult = listTree(repoRoot, commitHash);
  if (treeResult.error) return { error: treeResult.error };
  const tree = treeResult.result.filter((e) =>
    underProductRoot(e.path, productRoot),
  );

  const packageJsonEntries = tree.filter(
    (e) => e.path === "package.json" || e.path.endsWith("/package.json"),
  );
  const pkgBlobs = readBlobs(
    repoRoot,
    packageJsonEntries.map((e) => e.blobHash),
  );
  if (pkgBlobs.error) return { error: pkgBlobs.error };

  const nameByPath = new Map<string, string>();
  const packageJsonByDir = new Map<string, PackageJsonLayoutFields>();
  for (const entry of packageJsonEntries) {
    const text = pkgBlobs.result.get(entry.blobHash);
    if (text === undefined) continue;
    const name = parsePackageName(text);
    if (name) nameByPath.set(entry.path, name);
    const fields = parsePackageJsonFields(text);
    if (fields) {
      const dir = entry.path.replace(/\/?package\.json$/, "");
      packageJsonByDir.set(dir, fields);
    }
  }
  const roots = packageRootsFromPackageJsonPaths(
    packageJsonEntries.map((e) => e.path),
    nameByPath,
  );

  const packages =
    options.packages ??
    roots.map((r) => ({
      packageName: r.packageName,
      directory: productRoot
        ? r.directory === productRoot
          ? ""
          : r.directory.startsWith(productRoot + "/")
            ? r.directory.slice(productRoot.length + 1)
            : r.directory
        : r.directory,
    }));

  const allSourceEntries = tree.filter((e) => isSourcePath(e.path));
  const factsResult = await ensureBlobFacts(
    dbKey,
    repoRoot,
    allSourceEntries.map((e) => e.blobHash),
  );
  if (factsResult.error) return { error: factsResult.error };
  const facts = factsResult.result;

  const importers: UsedByImporterUnit[] = [];
  const exportsByPackage = new Map<
    string,
    Array<{ filePath: string; name: string; kind: string }>
  >();

  for (const entry of allSourceEntries) {
    const fileName = entry.path.split("/").pop() ?? entry.path;
    const fact = facts.get(entry.blobHash);
    if (!fact) continue;
    const importerRoot = packageForPath(entry.path, roots);
    const isTest = isTestSourcePath(entry.path, fileName);
    importers.push({
      path: entry.path,
      packageName: importerRoot.packageName,
      packageDirectory: importerRoot.directory,
      isTest,
      imports: blobFactImports(fact),
      localExportUsages: specialtyLocalExportUsages(fact.specialty),
    });

    if (isTest || isScaffoldTemplatePath(entry.path)) continue;
    const list = exportsByPackage.get(importerRoot.packageName) ?? [];
    for (const exp of blobFactExports(fact)) {
      list.push({
        filePath: entry.path,
        name: exp.name,
        kind: exp.kind,
      });
    }
    exportsByPackage.set(importerRoot.packageName, list);
  }

  const rows: Omit<InsertPackageIssueStatsParams, "commitHash">[] = [];

  for (const pkg of packages) {
    const packageRepoPath = joinRepoPath(productRoot, pkg.directory);
    const packageAbsDir = roots.find((r) => r.packageName === pkg.packageName)
      ?.directory;
    const pj =
      packageJsonByDir.get(packageAbsDir ?? packageRepoPath) ??
      packageJsonByDir.get(pkg.directory) ??
      {};

    const rootTsFiles: string[] = [];
    const sourceFiles: Array<{ localPath: string; lineCount: number }> = [];
    const rootPrefix = packageRepoPath
      ? packageRepoPath.endsWith("/")
        ? packageRepoPath
        : `${packageRepoPath}/`
      : "";

    for (const entry of allSourceEntries) {
      const inPkg =
        !packageRepoPath ||
        entry.path === packageRepoPath ||
        entry.path.startsWith(rootPrefix);
      if (!inPkg) continue;

      const local = packageLocalFromRepo(entry.path, packageRepoPath);
      const fileName = entry.path.split("/").pop() ?? entry.path;
      const isTest = isTestSourcePath(entry.path, fileName);

      // Root-level TS: local path has no slash
      if (
        !local.includes("/") &&
        (fileName.endsWith(".ts") || fileName.endsWith(".tsx")) &&
        !fileName.endsWith(".d.ts")
      ) {
        rootTsFiles.push(fileName);
      }

      if (isTest) continue;
      const fact = facts.get(entry.blobHash);
      if (!fact) continue;
      sourceFiles.push({ localPath: local, lineCount: fact.lineCount });
    }

    const layoutIssues: PackageIssue[] = checkPackageLayoutFromInputs({
      packageJson: pj,
      packageDirBasename: (packageAbsDir ?? (pkg.directory || "package"))
        .split("/")
        .pop()!,
      packageRepoPath,
      rootTsFiles,
      sourceFiles,
      maxSourceLines: DEFAULT_MAX_SOURCE_LINES,
    }).map((i: PackageLayoutIssue) => ({
      kind: i.kind,
      title: i.title,
      name: i.name,
      kindLabel: i.kindLabel,
      filePath: i.filePath,
      repoPath: i.repoPath,
    }));

    const isDb = looksLikeDbPackage(pkg.packageName, pkg.directory);
    let dbInventory:
      | {
          entities: Array<{
            entity: string;
            queries: Array<{
              fileName: string;
              filePath: string;
              exportName?: string | null;
              usedBy?: ExportUsedBy[] | null;
            }>;
          }>;
        }
      | undefined;

    const rawExports = exportsByPackage.get(pkg.packageName) ?? [];
    let usedByMap = new Map<string, ExportUsedBy[]>();

    if (isDb) {
      const inv = await assemblePackageDbInventory(
        dbKey,
        commitHash,
        pkg.packageName,
        options,
      );
      if (!inv.error) {
        dbInventory = inv.result;
      }
    } else {
      const targetRoot = roots.find((r) => r.packageName === pkg.packageName);
      if (targetRoot && rawExports.length > 0) {
        usedByMap = assembleUsedBy(
          pkg.packageName,
          targetRoot.directory,
          rawExports,
          importers,
        );
      }
    }

    const issues = collectPackageIssues(
      {
        packageName: pkg.packageName,
        directory: pkg.directory,
        productRoot,
        exports: isDb
          ? undefined
          : rawExports.map((e) => ({
              name: e.name,
              kind: e.kind,
              filePath: e.filePath,
              usedBy: usedByMap.get(exportUsedByKey(e.filePath, e.name)) ?? [],
            })),
        dbInventory,
        layoutIssues,
      },
      { packageDirectory: pkg.directory, productRoot },
    );

    const counts = countIssuesByKind(issues);
    for (const kind of PACKAGE_ISSUE_KINDS) {
      if (counts[kind] <= 0) continue;
      rows.push({
        packageName: pkg.packageName,
        kind,
        count: counts[kind],
      });
    }
  }

  return { result: rows };
}
