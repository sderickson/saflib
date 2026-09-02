/**
 * Compute per-package issue counts for a commit from git tree + blob_facts.
 * Layout/oversized use commit-scoped inputs (not the live working tree).
 */
import type { DbKey } from "@saflib/drizzle";
import {
  checkPackageLayoutFromInputs,
  classifySafPackage,
  DEFAULT_MAX_SOURCE_LINES,
  type PackageJsonLayoutFields,
  type ReturnsError,
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
  collectPublicExportPathsFromTree,
  createTreeResolveImportTarget,
  specialtyLocalExportUsages,
  type PackageIndex,
  type UsedByImporterUnit,
} from "@saflib/imports";
import {
  collectPackageIssues,
  countIssuesByKind,
  PACKAGE_ISSUE_KINDS,
} from "./package-issues.ts";
import { toPackageDetailForIssues } from "./wire-maps.ts";
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
} from "./classify.ts";
import { assemblePackageDbInventory, type PackageDbInventory } from "./assemble-package-db-inventory.ts";
import {
  exportUsedByKey,
  type ExportUsedBy,
} from "./assemble-export-used-by.ts";

function underProductRoot(path: string, product_root: string): boolean {
  if (!product_root) return true;
  return path === product_root || path.startsWith(product_root + "/");
}

function joinRepoPath(...parts: Array<string | undefined>): string {
  return parts
    .map((p) => (p ?? "").replace(/^\/+|\/+$/g, ""))
    .filter(Boolean)
    .join("/");
}

function packageLocalFromRepo(
  repo_path: string,
  packageRepoPath: string,
): string {
  if (!packageRepoPath) return repo_path;
  const prefix = packageRepoPath.endsWith("/")
    ? packageRepoPath
    : `${packageRepoPath}/`;
  if (repo_path === packageRepoPath) return ".";
  if (repo_path.startsWith(prefix)) return repo_path.slice(prefix.length);
  return repo_path;
}

function parsePackageJsonFields(text: string): PackageJsonLayoutFields | null {
  try {
    return JSON.parse(text) as PackageJsonLayoutFields;
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
    Pick<InsertPackageMetricsParams, "package_name" | "directory">
  >;
}

/**
 * Count issues by kind for every package at `commit_hash`.
 * Returns sparse insert rows (only kinds with count > 0).
 */
export async function computeCommitIssueStats(
  dbKey: DbKey,
  commit_hash: string,
  options: ComputeCommitIssueStatsOptions,
): Promise<
  ReturnsError<Omit<InsertPackageIssueStatsParams, "commit_hash">[], GitCommandError>
> {
  const repo_root = options.repo_root;
  const product_root = (options.product_root ?? "").replace(/^\/+|\/+$/g, "");

  const treeResult = listTree(repo_root, commit_hash);
  if (treeResult.error) return { error: treeResult.error };
  const tree = treeResult.result.filter((e) =>
    underProductRoot(e.path, product_root),
  );

  const packageJsonEntries = tree.filter(
    (e) => e.path === "package.json" || e.path.endsWith("/package.json"),
  );
  const pkgBlobs = readBlobs(
    repo_root,
    packageJsonEntries.map((e) => e.blobHash),
  );
  if (pkgBlobs.error) return { error: pkgBlobs.error };

  const nameByPath = new Map<string, string>();
  const packageJsonByDir = new Map<string, PackageJsonLayoutFields>();
  const importsMapByPackageDir = new Map<string, Record<string, string>>();
  const index: PackageIndex = new Map();
  for (const entry of packageJsonEntries) {
    const text = pkgBlobs.result.get(entry.blobHash);
    if (text === undefined) continue;
    const name = parsePackageName(text);
    if (name) nameByPath.set(entry.path, name);
    const fields = parsePackageJsonFields(text);
    const dir = entry.path.replace(/\/?package\.json$/, "");
    if (fields) {
      packageJsonByDir.set(dir, fields);
      if (name) index.set(name, { dir, exports: fields.exports });
    }
    try {
      const pj = JSON.parse(text) as { imports?: Record<string, string> };
      if (pj.imports) importsMapByPackageDir.set(dir, pj.imports);
    } catch {
      // skip invalid package.json
    }
  }
  const roots = packageRootsFromPackageJsonPaths(
    packageJsonEntries.map((e) => e.path),
    nameByPath,
  );
  const treePaths = new Set(tree.map((e) => e.path));
  const resolveImportTarget = createTreeResolveImportTarget({
    treePaths,
    index,
    importsMapByPackageDir,
    packageRoots: roots.map((r) => ({
      packageName: r.package_name,
      directory: r.directory,
    })),
  });

  const packages =
    options.packages ??
    roots.map((r) => ({
      package_name: r.package_name,
      directory: product_root
        ? r.directory === product_root
          ? ""
          : r.directory.startsWith(product_root + "/")
            ? r.directory.slice(product_root.length + 1)
            : r.directory
        : r.directory,
    }));

  const allSourceEntries = tree.filter((e) => isSourcePath(e.path));
  const factsResult = await ensureBlobFacts(
    dbKey,
    repo_root,
    allSourceEntries.map((e) => e.blobHash),
  );
  if (factsResult.error) return { error: factsResult.error };
  const facts = factsResult.result;

  const importers: UsedByImporterUnit[] = [];
  const exportsByPackage = new Map<
    string,
    Array<{ file_path: string; name: string; kind: string }>
  >();

  for (const entry of allSourceEntries) {
    const file_name = entry.path.split("/").pop() ?? entry.path;
    const fact = facts.get(entry.blobHash);
    if (!fact) continue;
    const importerRoot = packageForPath(entry.path, roots);
    const isTest = isTestSourcePath(entry.path, file_name);
    importers.push({
      path: entry.path,
      packageName: importerRoot.package_name,
      packageDirectory: importerRoot.directory,
      isTest,
      imports: blobFactImports(fact),
      localExportUsages: specialtyLocalExportUsages(fact.specialty),
    });

    if (isTest || isScaffoldTemplatePath(entry.path)) continue;
    const list = exportsByPackage.get(importerRoot.package_name) ?? [];
    for (const exp of blobFactExports(fact)) {
      list.push({
        file_path: entry.path,
        name: exp.name,
        kind: exp.kind,
      });
    }
    exportsByPackage.set(importerRoot.package_name, list);
  }

  const rows: Omit<InsertPackageIssueStatsParams, "commit_hash">[] = [];

  for (const pkg of packages) {
    const packageRepoPath = joinRepoPath(product_root, pkg.directory);
    const packageAbsDir = roots.find((r) => r.package_name === pkg.package_name)
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
      const file_name = entry.path.split("/").pop() ?? entry.path;
      const isTest = isTestSourcePath(entry.path, file_name);

      // Root-level TS: local path has no slash
      if (
        !local.includes("/") &&
        (file_name.endsWith(".ts") || file_name.endsWith(".tsx")) &&
        !file_name.endsWith(".d.ts")
      ) {
        rootTsFiles.push(file_name);
      }

      if (isTest) continue;
      const fact = facts.get(entry.blobHash);
      if (!fact) continue;
      sourceFiles.push({ localPath: local, lineCount: fact.line_count });
    }

    const layout_issues = checkPackageLayoutFromInputs({
      packageJson: pj,
      packageDirBasename: (packageAbsDir ?? (pkg.directory || "package"))
        .split("/")
        .pop()!,
      packageRepoPath,
      rootTsFiles,
      sourceFiles,
      maxSourceLines: DEFAULT_MAX_SOURCE_LINES,
    });

    const isDb = classifySafPackage(pj).kind === "db";
    let db_inventory: PackageDbInventory | undefined;

    const rawExports = exportsByPackage.get(pkg.package_name) ?? [];
    let usedByMap = new Map<string, ExportUsedBy[]>();

    if (isDb) {
      const inv = await assemblePackageDbInventory(
        dbKey,
        commit_hash,
        pkg.package_name,
        options,
      );
      if (!inv.error) {
        db_inventory = inv.result;
      }
    } else {
      const targetRoot = roots.find((r) => r.package_name === pkg.package_name);
      if (targetRoot && rawExports.length > 0) {
        usedByMap = assembleUsedBy(
          pkg.package_name,
          targetRoot.directory,
          rawExports.map((e) => ({ filePath: e.file_path, name: e.name })),
          importers,
          { resolveImportTarget },
        );
      }
    }

    const issues = collectPackageIssues(
      toPackageDetailForIssues({
        package_name: pkg.package_name,
        directory: pkg.directory,
        product_root,
        exports: isDb
          ? undefined
          : rawExports.map((e) => ({
              name: e.name,
              kind: e.kind,
              file_path: e.file_path,
              used_by: usedByMap.get(exportUsedByKey(e.file_path, e.name)) ?? [],
            })),
        db_inventory,
        layout_issues,
        public_export_file_paths: collectPublicExportPathsFromTree(
          packageRepoPath,
          pj.exports,
          treePaths,
        ),
      }),
      { packageDirectory: pkg.directory, productRoot: product_root },
    );

    const counts = countIssuesByKind(issues);
    for (const kind of PACKAGE_ISSUE_KINDS) {
      if (counts[kind] <= 0) continue;
      rows.push({
        package_name: pkg.package_name,
        kind,
        count: counts[kind],
      });
    }
  }

  return { result: rows };
}
