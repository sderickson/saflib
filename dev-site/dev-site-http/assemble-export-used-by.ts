import type { DbKey } from "@saflib/drizzle";
import type { ReturnsError } from "@saflib/monorepo";
import type { GitCommandError } from "@saflib/git";
import { listTree, readBlobs } from "@saflib/git";
import { blobFactImports } from "@saflib/dev-site-db/types";
import { ensureBlobFacts, type AnalyzeCommitOptions } from "./analyze-commit.ts";
import {
  isSourcePath,
  isTestSourcePath,
  packageForPath,
  packageRootsFromPackageJsonPaths,
  parsePackageName,
} from "./classify.ts";
import {
  moduleTargetFromImport,
  packageLocalPath,
  stripTsExt,
  type ImportUsedBy,
} from "./import-resolution.ts";

export type ExportUsedBy = ImportUsedBy;

/**
 * Reverse-index of non-test importers for each export in a package.
 * Key: `${filePath}\0${exportName}`.
 */
export type ExportUsedByMap = Map<string, ExportUsedBy[]>;

export function exportUsedByKey(filePath: string, exportName: string): string {
  return `${filePath}\0${exportName}`;
}

/**
 * Walk all product source blobs, find imports targeting `packageName`, and
 * return importers keyed by export filePath + name.
 *
 * Named imports attribute to that export; `*`, `default`, or empty names
 * attribute to every export listed for that module in `exportKeys`.
 */
export async function assembleExportUsedBy(
  dbKey: DbKey,
  commitHash: string,
  packageName: string,
  /** Known exports in the target package (`filePath` + `name`). */
  exports: Array<{ filePath: string; name: string }>,
  options: AnalyzeCommitOptions,
): Promise<ReturnsError<ExportUsedByMap, GitCommandError>> {
  const out: ExportUsedByMap = new Map();
  if (exports.length === 0) return { result: out };

  const repoRoot = options.repoRoot;
  const productRoot = (options.productRoot ?? "").replace(/^\/+|\/+$/g, "");

  const treeResult = listTree(repoRoot, commitHash);
  if (treeResult.error) return { error: treeResult.error };
  const tree = treeResult.result.filter((e) => {
    if (!productRoot) return true;
    return e.path === productRoot || e.path.startsWith(productRoot + "/");
  });

  const packageJsonEntries = tree.filter(
    (e) => e.path === "package.json" || e.path.endsWith("/package.json"),
  );
  const pkgBlobHashes = packageJsonEntries.map((e) => e.blobHash);
  const pkgBlobs = readBlobs(repoRoot, pkgBlobHashes);
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
  const targetRoot = roots.find((r) => r.packageName === packageName);
  if (!targetRoot) return { result: out };

  /** modulePath (package-relative, no ext) → export names in that module */
  const exportsByModule = new Map<string, Array<{ filePath: string; name: string }>>();
  const pkgPrefix = targetRoot.directory
    ? targetRoot.directory.replace(/\/+$/, "") + "/"
    : "";
  for (const exp of exports) {
    const rel = pkgPrefix && exp.filePath.startsWith(pkgPrefix)
      ? exp.filePath.slice(pkgPrefix.length)
      : exp.filePath;
    let mod = stripTsExt(rel);
    if (mod.endsWith("/index")) mod = mod.slice(0, -"/index".length) || "index";
    if (mod === "" || mod === "index") mod = "index";
    let list = exportsByModule.get(mod);
    if (!list) {
      list = [];
      exportsByModule.set(mod, list);
    }
    list.push(exp);
  }

  const allSourceEntries = tree.filter((e) => isSourcePath(e.path));
  const factsResult = await ensureBlobFacts(
    dbKey,
    repoRoot,
    allSourceEntries.map((e) => e.blobHash),
  );
  if (factsResult.error) return { error: factsResult.error };
  const facts = factsResult.result;

  /** exportKey → importerKey → usedBy */
  const buckets = new Map<string, Map<string, ExportUsedBy>>();

  const addImporter = (
    exp: { filePath: string; name: string },
    used: ExportUsedBy,
  ) => {
    const eKey = exportUsedByKey(exp.filePath, exp.name);
    let byImporter = buckets.get(eKey);
    if (!byImporter) {
      byImporter = new Map();
      buckets.set(eKey, byImporter);
    }
    byImporter.set(`${used.packageName}\0${used.repoPath}`, used);
  };

  for (const entry of allSourceEntries) {
    const fileName = entry.path.split("/").pop() ?? entry.path;
    if (isTestSourcePath(entry.path, fileName)) continue;
    const fact = facts.get(entry.blobHash);
    if (!fact) continue;
    const importerRoot = packageForPath(entry.path, roots);
    const used: ExportUsedBy = {
      packageName: importerRoot.packageName,
      filePath: packageLocalPath(entry.path, importerRoot.directory),
      repoPath: entry.path,
    };

    for (const imp of blobFactImports(fact)) {
      const mod = moduleTargetFromImport(
        packageName,
        targetRoot.directory,
        entry.path,
        imp.specifier,
      );
      if (!mod) continue;
      const moduleExports = exportsByModule.get(mod);
      if (!moduleExports?.length) continue;

      const names = imp.names;
      const fileLevel =
        names.length === 0 || names.includes("*") || names.includes("default");

      if (fileLevel) {
        for (const exp of moduleExports) addImporter(exp, used);
        continue;
      }

      const wanted = new Set(names);
      for (const exp of moduleExports) {
        if (wanted.has(exp.name)) addImporter(exp, used);
      }
    }
  }

  for (const [eKey, byImporter] of buckets) {
    out.set(
      eKey,
      [...byImporter.values()].sort(
        (a, b) =>
          a.packageName.localeCompare(b.packageName) ||
          a.filePath.localeCompare(b.filePath),
      ),
    );
  }

  return { result: out };
}
