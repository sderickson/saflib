import type { DbKey } from "@saflib/drizzle";
import type { ReturnsError } from "@saflib/utils";
import type { GitCommandError } from "@saflib/git";
import { listTree, readBlobs } from "@saflib/git";
import { blobFactImports } from "@saflib/dev-site-db/types";
import {
  assembleUsedBy,
  createTreeResolveImportTarget,
  exportUsedByKey,
  specialtyLocalExportUsages,
  type ExportUsedBy,
  type ExportUsedByMap,
  type PackageIndex,
  type UsedByImporterUnit,
} from "@saflib/imports";
import { ensureBlobFacts, type AnalyzeCommitOptions } from "./analyze-commit.ts";
import {
  isSourcePath,
  isTestSourcePath,
  packageForPath,
  packageRootsFromPackageJsonPaths,
} from "./classify.ts";

export type { ExportUsedBy, ExportUsedByMap };
export { exportUsedByKey };

function parsePackageJson(text: string): {
  name?: string;
  exports?: unknown;
  imports?: Record<string, string>;
} | null {
  try {
    return JSON.parse(text) as {
      name?: string;
      exports?: unknown;
      imports?: Record<string, string>;
    };
  } catch {
    return null;
  }
}

/**
 * Walk all product source blobs, find imports targeting `package_name`, and
 * return importers keyed by export file_path + name.
 */
export async function assembleExportUsedBy(
  dbKey: DbKey,
  commit_hash: string,
  package_name: string,
  /** Known exports in the target package (`file_path` + `name`). */
  exports: Array<{ file_path: string; name: string }>,
  options: AnalyzeCommitOptions,
): Promise<ReturnsError<ExportUsedByMap, GitCommandError>> {
  const out: ExportUsedByMap = new Map();
  if (exports.length === 0) return { result: out };

  const repo_root = options.repo_root;
  const product_root = (options.product_root ?? "").replace(/^\/+|\/+$/g, "");

  const treeResult = listTree(repo_root, commit_hash);
  if (treeResult.error) return { error: treeResult.error };
  const tree = treeResult.result.filter((e) => {
    if (!product_root) return true;
    return e.path === product_root || e.path.startsWith(product_root + "/");
  });

  const packageJsonEntries = tree.filter(
    (e) => e.path === "package.json" || e.path.endsWith("/package.json"),
  );
  const pkgBlobHashes = packageJsonEntries.map((e) => e.blobHash);
  const pkgBlobs = readBlobs(repo_root, pkgBlobHashes);
  if (pkgBlobs.error) return { error: pkgBlobs.error };

  const nameByPath = new Map<string, string>();
  const importsMapByPackageDir = new Map<string, Record<string, string>>();
  const index: PackageIndex = new Map();

  for (const entry of packageJsonEntries) {
    const text = pkgBlobs.result.get(entry.blobHash);
    if (text === undefined) continue;
    const pj = parsePackageJson(text);
    if (!pj) continue;
    const dir = entry.path.replace(/\/?package\.json$/, "");
    if (pj.name) {
      nameByPath.set(entry.path, pj.name);
      index.set(pj.name, { dir, exports: pj.exports });
    }
    if (pj.imports) {
      importsMapByPackageDir.set(dir, pj.imports);
    }
  }

  const roots = packageRootsFromPackageJsonPaths(
    packageJsonEntries.map((e) => e.path),
    nameByPath,
  );
  const targetRoot = roots.find((r) => r.package_name === package_name);
  if (!targetRoot) return { result: out };

  const allSourceEntries = tree.filter((e) => isSourcePath(e.path));
  const treePaths = new Set(tree.map((e) => e.path));
  const factsResult = await ensureBlobFacts(
    dbKey,
    repo_root,
    allSourceEntries.map((e) => e.blobHash),
  );
  if (factsResult.error) return { error: factsResult.error };
  const facts = factsResult.result;

  const resolveImportTarget = createTreeResolveImportTarget({
    treePaths,
    index,
    importsMapByPackageDir,
    packageRoots: roots.map((r) => ({
      packageName: r.package_name,
      directory: r.directory,
    })),
  });

  const importers: UsedByImporterUnit[] = [];
  for (const entry of allSourceEntries) {
    const file_name = entry.path.split("/").pop() ?? entry.path;
    const fact = facts.get(entry.blobHash);
    if (!fact) continue;
    const importerRoot = packageForPath(entry.path, roots);
    importers.push({
      path: entry.path,
      packageName: importerRoot.package_name,
      packageDirectory: importerRoot.directory,
      isTest: isTestSourcePath(entry.path, file_name),
      imports: blobFactImports(fact),
      localExportUsages: specialtyLocalExportUsages(fact.specialty),
    });
  }

  return {
    result: assembleUsedBy(
      package_name,
      targetRoot.directory,
      exports.map((e) => ({ filePath: e.file_path, name: e.name })),
      importers,
      { resolveImportTarget },
    ),
  };
}
