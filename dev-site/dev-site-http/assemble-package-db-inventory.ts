import type { DbKey } from "@saflib/drizzle";
import type { ReturnsError } from "@saflib/monorepo";
import type { GitCommandError } from "@saflib/git";
import { listTree, readBlobs } from "@saflib/git";
import {
  blobFactImports,
  blobFactTables,
  type BlobTableFact,
} from "@saflib/dev-site-db/types";
import { ensureBlobFacts, type AnalyzeCommitOptions } from "./analyze-commit.ts";
import {
  isSourcePath,
  isTestSourcePath,
  packageForPath,
  packageRootsFromPackageJsonPaths,
  parsePackageName,
} from "./classify.ts";

export interface DbInventoryTable {
  exportName: string;
  tableName: string;
  docstring: string | null;
  columns: Array<{
    propName: string;
    sqlName: string;
    typeKind: string;
    docstring: string | null;
  }>;
  filePath: string;
}

export interface DbInventoryUsedBy {
  packageName: string;
  filePath: string;
}

export interface DbInventoryEntity {
  /** Query dir name or schema stem, e.g. `package-metrics`. */
  entity: string;
  table: DbInventoryTable | null;
  /** Non-test product files that import this entity's query modules. */
  usedBy: DbInventoryUsedBy[];
}

export interface PackageDbInventory {
  entities: DbInventoryEntity[];
}

function normalizeEntityKey(name: string): string {
  return name.replace(/-/g, "_").toLowerCase();
}

function entityFromTableName(tableName: string): string {
  return tableName.replace(/_/g, "-");
}

/** POSIX-ish resolve of `fromDir/specifier` without touching the filesystem. */
function resolveRelative(fromFile: string, specifier: string): string {
  const fromDir = fromFile.includes("/")
    ? fromFile.slice(0, fromFile.lastIndexOf("/"))
    : "";
  const joined = fromDir ? `${fromDir}/${specifier}` : specifier;
  const parts: string[] = [];
  for (const p of joined.split("/")) {
    if (!p || p === ".") continue;
    if (p === "..") {
      parts.pop();
      continue;
    }
    parts.push(p);
  }
  return parts.join("/");
}

function stripTsExt(path: string): string {
  return path.replace(/\.(tsx?|jsx?|mjs|cjs)$/, "");
}

/**
 * If `specifier` (absolute or relative to `importerPath`) targets
 * `${packageName}/queries/<entity>/…` or `<pkgDir>/queries/<entity>/…`,
 * return the entity name.
 */
function entityFromQueryImport(
  packageName: string,
  packageDirectory: string,
  importerPath: string,
  specifier: string,
): string | null {
  const absPrefix = `${packageName}/queries/`;
  if (specifier.startsWith(absPrefix)) {
    const rest = specifier.slice(absPrefix.length);
    const entity = rest.split("/")[0];
    return entity || null;
  }

  if (!specifier.startsWith(".")) return null;
  const resolved = stripTsExt(resolveRelative(importerPath, specifier));
  const pkgPrefix = packageDirectory
    ? packageDirectory.replace(/\/+$/, "") + "/"
    : "";
  const rel = pkgPrefix && resolved.startsWith(pkgPrefix)
    ? resolved.slice(pkgPrefix.length)
    : !pkgPrefix
      ? resolved
      : null;
  if (rel === null) return null;
  const m = /^queries\/([^/]+)\//.exec(rel);
  return m?.[1] ?? null;
}

/**
 * Assemble drizzle tables (from blob_facts) + query dirs (from ls-tree)
 * for one db package. Query dirs discover entities; query filenames are not
 * surfaced (tests under the dir are the Spec). `usedBy` is a reverse index of
 * non-test product files importing `queries/<entity>/…`.
 */
export async function assemblePackageDbInventory(
  dbKey: DbKey,
  commitHash: string,
  packageName: string,
  options: AnalyzeCommitOptions,
): Promise<ReturnsError<PackageDbInventory, GitCommandError>> {
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
  if (!targetRoot) {
    return { result: { entities: [] } };
  }

  const underPackage = (path: string) => {
    const d = targetRoot.directory;
    if (!d) return true;
    return path === d || path.startsWith(d + "/");
  };

  const pkgPrefix = targetRoot.directory
    ? targetRoot.directory.replace(/\/+$/, "") + "/"
    : "";
  const relativeToPackage = (path: string) =>
    pkgPrefix && path.startsWith(pkgPrefix)
      ? path.slice(pkgPrefix.length)
      : path;

  const packageSourceEntries = tree.filter(
    (e) => isSourcePath(e.path) && underPackage(e.path),
  );
  const allSourceEntries = tree.filter((e) => isSourcePath(e.path));
  const factsResult = await ensureBlobFacts(
    dbKey,
    repoRoot,
    allSourceEntries.map((e) => e.blobHash),
  );
  if (factsResult.error) return { error: factsResult.error };
  const facts = factsResult.result;

  type TableWithPath = BlobTableFact & { filePath: string };
  const tables: TableWithPath[] = [];
  for (const entry of packageSourceEntries) {
    const fact = facts.get(entry.blobHash);
    if (!fact) continue;
    for (const t of blobFactTables(fact)) {
      tables.push({ ...t, filePath: entry.path });
    }
  }

  const queryEntities = new Set<string>();
  for (const entry of tree) {
    if (!underPackage(entry.path)) continue;
    const rel = relativeToPackage(entry.path);
    const m = /^queries\/([^/]+)\//.exec(rel);
    if (!m) continue;
    queryEntities.add(m[1]!);
  }

  const byKey = new Map<string, DbInventoryEntity>();

  const ensureEntity = (entityLabel: string): DbInventoryEntity => {
    const key = normalizeEntityKey(entityLabel);
    let row = byKey.get(key);
    if (!row) {
      row = {
        entity: entityLabel.includes("_")
          ? entityLabel.replace(/_/g, "-")
          : entityLabel,
        table: null,
        usedBy: [],
      };
      byKey.set(key, row);
    }
    return row;
  };

  for (const entity of queryEntities) {
    const row = ensureEntity(entity);
    row.entity = entity;
  }

  for (const t of tables) {
    const entityGuess = entityFromTableName(t.tableName);
    const row = ensureEntity(entityGuess);
    row.table = {
      exportName: t.exportName,
      tableName: t.tableName,
      docstring: t.docstring ?? null,
      columns: t.columns.map((c) => ({
        propName: c.propName,
        sqlName: c.sqlName,
        typeKind: c.typeKind,
        docstring: c.docstring ?? null,
      })),
      filePath: t.filePath,
    };
  }

  const usedBySets = new Map<string, Map<string, DbInventoryUsedBy>>();
  for (const entry of allSourceEntries) {
    const fileName = entry.path.split("/").pop() ?? entry.path;
    if (isTestSourcePath(entry.path, fileName)) continue;
    const fact = facts.get(entry.blobHash);
    if (!fact) continue;
    const importerPkg = packageForPath(entry.path, roots).packageName;
    for (const imp of blobFactImports(fact)) {
      const entity = entityFromQueryImport(
        packageName,
        targetRoot.directory,
        entry.path,
        imp.specifier,
      );
      if (!entity) continue;
      const key = normalizeEntityKey(entity);
      // Only record for entities we already track (table or query dir).
      if (!byKey.has(key)) continue;
      let set = usedBySets.get(key);
      if (!set) {
        set = new Map();
        usedBySets.set(key, set);
      }
      set.set(`${importerPkg}\0${entry.path}`, {
        packageName: importerPkg,
        filePath: entry.path,
      });
    }
  }

  for (const [key, set] of usedBySets) {
    const row = byKey.get(key);
    if (!row) continue;
    row.usedBy = [...set.values()].sort(
      (a, b) =>
        a.packageName.localeCompare(b.packageName) ||
        a.filePath.localeCompare(b.filePath),
    );
  }

  const entities = [...byKey.values()].sort((a, b) =>
    a.entity.localeCompare(b.entity),
  );

  return { result: { entities } };
}

/** Flatten inventory tables for commit-level schema diffs. */
export function flattenInventoryTables(
  packageName: string,
  inventory: PackageDbInventory,
): Array<{
  packageName: string;
  tableName: string;
  exportName: string;
  filePath: string;
  docstring: string | null;
  columns: Array<{
    sqlName: string;
    typeKind: string;
    propName: string;
    docstring: string | null;
  }>;
}> {
  const out: Array<{
    packageName: string;
    tableName: string;
    exportName: string;
    filePath: string;
    docstring: string | null;
    columns: Array<{
      sqlName: string;
      typeKind: string;
      propName: string;
      docstring: string | null;
    }>;
  }> = [];
  for (const e of inventory.entities) {
    if (!e.table) continue;
    out.push({
      packageName,
      tableName: e.table.tableName,
      exportName: e.table.exportName,
      filePath: e.table.filePath,
      docstring: e.table.docstring,
      columns: e.table.columns,
    });
  }
  return out;
}
