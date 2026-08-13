import type { DbKey } from "@saflib/drizzle";
import type { ReturnsError } from "@saflib/monorepo";
import type { GitCommandError } from "@saflib/git";
import { listTree, readBlobs } from "@saflib/git";
import {
  blobFactExports,
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
  /** Path within the importing package (no package-root prefix). */
  filePath: string;
  /** Repo-relative path for source links. */
  repoPath: string;
}

export interface DbInventoryQuery {
  /** Leaf filename without path, e.g. `create.ts`. */
  fileName: string;
  /** Repo-relative path to the query module. */
  filePath: string;
  /** Primary exported symbol name when known. */
  exportName: string | null;
  /** Syntactic signature of the primary export. */
  signature: string | null;
  /** Best-effort docstring from the query's primary export. */
  docstring: string | null;
  /** Non-test product files that import this leaf module. */
  usedBy: DbInventoryUsedBy[];
}

export interface DbInventoryEntity {
  /** Query dir name or schema stem, e.g. `package-metrics`. */
  entity: string;
  table: DbInventoryTable | null;
  /**
   * Distinct packages (non-test) that import any query under this entity.
   * Shown on the table card.
   */
  usedByPackages: string[];
  queries: DbInventoryQuery[];
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
 * If specifier targets this package's `queries/<entity>/<leaf>`, return
 * `{ entity, leaf }` where leaf is the module stem (`create`, not `create.ts`).
 */
function queryTargetFromImport(
  packageName: string,
  packageDirectory: string,
  importerPath: string,
  specifier: string,
): { entity: string; leaf: string } | null {
  const absPrefix = `${packageName}/queries/`;
  let relUnderQueries: string | null = null;

  if (specifier.startsWith(absPrefix)) {
    relUnderQueries = specifier.slice(absPrefix.length);
  } else if (specifier.startsWith(".")) {
    const resolved = stripTsExt(resolveRelative(importerPath, specifier));
    const pkgPrefix = packageDirectory
      ? packageDirectory.replace(/\/+$/, "") + "/"
      : "";
    const rel =
      pkgPrefix && resolved.startsWith(pkgPrefix)
        ? resolved.slice(pkgPrefix.length)
        : !pkgPrefix
          ? resolved
          : null;
    if (rel === null) return null;
    const m = /^queries\/(.+)$/.exec(rel);
    if (!m) return null;
    relUnderQueries = m[1]!;
  }

  if (!relUnderQueries) return null;
  const parts = relUnderQueries.split("/").filter(Boolean);
  if (parts.length < 2) return null;
  const entity = parts[0]!;
  const leaf = stripTsExt(parts[parts.length - 1]!);
  if (!entity || !leaf || leaf === "index") return null;
  return { entity, leaf };
}

function pickQueryExport(
  exports: Array<{
    name: string;
    kind: string;
    signature: string | null;
    docstring: string | null;
  }>,
  leafStem: string,
): {
  exportName: string | null;
  signature: string | null;
  docstring: string | null;
} {
  const camel =
    leafStem.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase()) ?? leafStem;
  const preferred =
    exports.find(
      (e) =>
        e.name === camel ||
        e.name.toLowerCase().startsWith(camel.toLowerCase()) ||
        e.name.toLowerCase().endsWith(camel.toLowerCase()),
    ) ??
    exports.find((e) => e.kind === "function" || e.kind === "const") ??
    exports[0];
  if (!preferred) {
    return { exportName: null, signature: null, docstring: null };
  }
  return {
    exportName: preferred.name,
    signature: preferred.signature,
    docstring: preferred.docstring,
  };
}

/**
 * Assemble drizzle tables + query dirs for one db package.
 * - `usedByPackages`: packages importing any query under the entity
 * - `queries[].usedBy`: files importing that specific leaf module
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

  /** entityKey → leafStem → query row */
  const queriesByEntity = new Map<string, Map<string, DbInventoryQuery>>();

  for (const entry of tree) {
    if (!underPackage(entry.path)) continue;
    const rel = relativeToPackage(entry.path);
    const m = /^queries\/([^/]+)\/([^/]+\.ts)$/.exec(rel);
    if (!m) continue;
    const entity = m[1]!;
    const fileName = m[2]!;
    if (fileName === "index.ts" || fileName.endsWith(".test.ts")) continue;
    const leaf = stripTsExt(fileName);
    const fact = facts.get(entry.blobHash);
    const picked = fact
      ? pickQueryExport(blobFactExports(fact), leaf)
      : { exportName: null, signature: null, docstring: null };
    const eKey = normalizeEntityKey(entity);
    let byLeaf = queriesByEntity.get(eKey);
    if (!byLeaf) {
      byLeaf = new Map();
      queriesByEntity.set(eKey, byLeaf);
    }
    byLeaf.set(leaf, {
      fileName,
      filePath: entry.path,
      exportName: picked.exportName,
      signature: picked.signature,
      docstring: picked.docstring,
      usedBy: [],
    });
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
        usedByPackages: [],
        queries: [],
      };
      byKey.set(key, row);
    }
    return row;
  };

  for (const [eKey, byLeaf] of queriesByEntity) {
    const first = [...byLeaf.values()][0];
    const entityLabel =
      first &&
      (() => {
        const m = /\/queries\/([^/]+)\//.exec(first.filePath);
        return m?.[1];
      })();
    const row = ensureEntity(entityLabel ?? eKey);
    row.queries = [...byLeaf.values()].sort((a, b) =>
      a.fileName.localeCompare(b.fileName),
    );
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

  /** entityKey → leaf → usedBy map */
  const queryUsedBy = new Map<
    string,
    Map<string, Map<string, DbInventoryUsedBy>>
  >();
  const entityPackages = new Map<string, Set<string>>();

  for (const entry of allSourceEntries) {
    const fileName = entry.path.split("/").pop() ?? entry.path;
    if (isTestSourcePath(entry.path, fileName)) continue;
    const fact = facts.get(entry.blobHash);
    if (!fact) continue;
    const importerRoot = packageForPath(entry.path, roots);
    const importerPkg = importerRoot.packageName;
    const localPath =
      importerRoot.directory &&
      entry.path.startsWith(`${importerRoot.directory}/`)
        ? entry.path.slice(importerRoot.directory.length + 1)
        : entry.path;
    for (const imp of blobFactImports(fact)) {
      const target = queryTargetFromImport(
        packageName,
        targetRoot.directory,
        entry.path,
        imp.specifier,
      );
      if (!target) continue;
      const eKey = normalizeEntityKey(target.entity);
      if (!byKey.has(eKey)) continue;

      let pkgs = entityPackages.get(eKey);
      if (!pkgs) {
        pkgs = new Set();
        entityPackages.set(eKey, pkgs);
      }
      pkgs.add(importerPkg);

      let byLeaf = queryUsedBy.get(eKey);
      if (!byLeaf) {
        byLeaf = new Map();
        queryUsedBy.set(eKey, byLeaf);
      }
      let used = byLeaf.get(target.leaf);
      if (!used) {
        used = new Map();
        byLeaf.set(target.leaf, used);
      }
      used.set(`${importerPkg}\0${entry.path}`, {
        packageName: importerPkg,
        filePath: localPath,
        repoPath: entry.path,
      });
    }
  }

  for (const [eKey, row] of byKey) {
    const pkgs = entityPackages.get(eKey);
    row.usedByPackages = pkgs
      ? [...pkgs].sort((a, b) => a.localeCompare(b))
      : [];

    const byLeaf = queryUsedBy.get(eKey);
    if (!byLeaf) continue;
    for (const q of row.queries) {
      const leaf = stripTsExt(q.fileName);
      const used = byLeaf.get(leaf);
      if (!used) continue;
      q.usedBy = [...used.values()].sort(
        (a, b) =>
          a.packageName.localeCompare(b.packageName) ||
          a.filePath.localeCompare(b.filePath),
      );
    }
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
