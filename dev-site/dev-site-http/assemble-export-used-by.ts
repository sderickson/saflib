import type { DbKey } from "@saflib/drizzle";
import type { ReturnsError } from "@saflib/monorepo";
import type { GitCommandError } from "@saflib/git";
import { listTree, readBlobs } from "@saflib/git";
import { blobFactImports } from "@saflib/dev-site-db/types";
import {
  assembleUsedBy,
  exportUsedByKey,
  specialtyLocalExportUsages,
  type ExportUsedBy,
  type ExportUsedByMap,
  type UsedByImporterUnit,
} from "@saflib/imports";
import { ensureBlobFacts, type AnalyzeCommitOptions } from "./analyze-commit.ts";
import {
  isSourcePath,
  isTestSourcePath,
  packageForPath,
  packageRootsFromPackageJsonPaths,
  parsePackageName,
} from "./classify.ts";

export type { ExportUsedBy, ExportUsedByMap };
export { exportUsedByKey };

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
  for (const entry of packageJsonEntries) {
    const text = pkgBlobs.result.get(entry.blobHash);
    if (text === undefined) continue;
    const name = parsePackageName(text);
    if (name) nameByPath.set(entry.path, name);
  }
  const roots = packageRootsFromPackageJsonPaths(
    packageJsonEntries.map((e) => e.path),
    nameByPath,
  );
  const targetRoot = roots.find((r) => r.package_name === package_name);
  if (!targetRoot) return { result: out };

  const allSourceEntries = tree.filter((e) => isSourcePath(e.path));
  const factsResult = await ensureBlobFacts(
    dbKey,
    repo_root,
    allSourceEntries.map((e) => e.blobHash),
  );
  if (factsResult.error) return { error: factsResult.error };
  const facts = factsResult.result;

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
    ),
  };
}
