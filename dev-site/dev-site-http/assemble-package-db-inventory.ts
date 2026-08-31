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
import {
  moduleTargetFromImport,
  packageLocalPath,
  stripTsExt,
} from "./import-resolution.ts";

export interface DbInventoryTable {
  export_name: string;
  table_name: string;
  docstring: string | null;
  columns: Array<{
    prop_name: string;
    sql_name: string;
    type_kind: string;
    docstring: string | null;
  }>;
  file_path: string;
}

export type DbInventoryUsedBy = {
  package_name: string;
  file_path: string;
  repo_path: string;
};

export interface DbInventoryQuery {
  /** Leaf filename without path, e.g. `create.ts`. */
  file_name: string;
  /** Repo-relative path to the query module. */
  file_path: string;
  /** Primary exported symbol name when known. */
  export_name: string | null;
  /** Syntactic signature of the primary export. */
  signature: string | null;
  /** Best-effort docstring from the query's primary export. */
  docstring: string | null;
  /** Non-test product files that import this leaf module. */
  used_by: DbInventoryUsedBy[];
}

export interface DbInventoryEntity {
  /** Query dir name or schema stem, e.g. `package-metrics`. */
  entity: string;
  table: DbInventoryTable | null;
  /**
   * Distinct packages (non-test) that import any query under this entity.
   * Shown on the table card.
   */
  used_by_packages: string[];
  queries: DbInventoryQuery[];
}

export interface PackageDbInventory {
  entities: DbInventoryEntity[];
}

function normalizeEntityKey(name: string): string {
  return name.replace(/-/g, "_").toLowerCase();
}

function entityFromTableName(table_name: string): string {
  return table_name.replace(/_/g, "-");
}

/**
 * If specifier targets this package's `queries/<entity>/<leaf>`, return
 * `{ entity, leaf }` where leaf is the module stem (`create`, not `create.ts`).
 */
function queryTargetFromImport(
  package_name: string,
  package_directory: string,
  importerPath: string,
  specifier: string,
): { entity: string; leaf: string } | null {
  const mod = moduleTargetFromImport(
    package_name,
    package_directory,
    importerPath,
    specifier,
  );
  if (!mod) return null;
  const m = /^queries\/([^/]+)\/(.+)$/.exec(mod);
  if (!m) return null;
  const entity = m[1]!;
  const leaf = stripTsExt(m[2]!.split("/").pop()!);
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
  export_name: string | null;
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
    return { export_name: null, signature: null, docstring: null };
  }
  return {
    export_name: preferred.name,
    signature: preferred.signature,
    docstring: preferred.docstring,
  };
}

/**
 * Assemble drizzle tables + query dirs for one db package.
 * - `used_by_packages`: packages importing any query under the entity
 * - `queries[].used_by`: files importing that specific leaf module
 */
export async function assemblePackageDbInventory(
  dbKey: DbKey,
  commit_hash: string,
  package_name: string,
  options: AnalyzeCommitOptions,
): Promise<ReturnsError<PackageDbInventory, GitCommandError>> {
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
    repo_root,
    allSourceEntries.map((e) => e.blobHash),
  );
  if (factsResult.error) return { error: factsResult.error };
  const facts = factsResult.result;

  type TableWithPath = BlobTableFact & { file_path: string };
  const tables: TableWithPath[] = [];
  for (const entry of packageSourceEntries) {
    const fact = facts.get(entry.blobHash);
    if (!fact) continue;
    for (const t of blobFactTables(fact)) {
      tables.push({ ...t, file_path: entry.path });
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
    const file_name = m[2]!;
    if (file_name === "index.ts" || file_name.endsWith(".test.ts")) continue;
    // Match classify.isTestSourcePath — fixtures are test helpers, not product queries.
    if (file_name.endsWith(".fixtures.ts") || file_name.endsWith(".fixtures.tsx")) {
      continue;
    }
    const leaf = stripTsExt(file_name);
    const fact = facts.get(entry.blobHash);
    const picked = fact
      ? pickQueryExport(blobFactExports(fact), leaf)
      : { export_name: null, signature: null, docstring: null };
    const eKey = normalizeEntityKey(entity);
    let byLeaf = queriesByEntity.get(eKey);
    if (!byLeaf) {
      byLeaf = new Map();
      queriesByEntity.set(eKey, byLeaf);
    }
    byLeaf.set(leaf, {
      file_name,
      file_path: entry.path,
      export_name: picked.export_name,
      signature: picked.signature,
      docstring: picked.docstring,
      used_by: [],
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
        used_by_packages: [],
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
        const m = /\/queries\/([^/]+)\//.exec(first.file_path);
        return m?.[1];
      })();
    const row = ensureEntity(entityLabel ?? eKey);
    row.queries = [...byLeaf.values()].sort((a, b) =>
      a.file_name.localeCompare(b.file_name),
    );
  }

  for (const t of tables) {
    const entityGuess = entityFromTableName(t.tableName);
    const row = ensureEntity(entityGuess);
    row.table = {
      export_name: t.exportName,
      table_name: t.tableName,
      docstring: t.docstring ?? null,
      columns: t.columns.map((c) => ({
        prop_name: c.propName,
        sql_name: c.sqlName,
        type_kind: c.typeKind,
        docstring: c.docstring ?? null,
      })),
      file_path: t.file_path,
    };
  }

  /** entityKey → leaf → used_by map */
  const queryUsedBy = new Map<
    string,
    Map<string, Map<string, DbInventoryUsedBy>>
  >();
  const entityPackages = new Map<string, Set<string>>();

  for (const entry of allSourceEntries) {
    const file_name = entry.path.split("/").pop() ?? entry.path;
    if (isTestSourcePath(entry.path, file_name)) continue;
    const fact = facts.get(entry.blobHash);
    if (!fact) continue;
    const importerRoot = packageForPath(entry.path, roots);
    const importerPkg = importerRoot.package_name;
    const localPath = packageLocalPath(entry.path, importerRoot.directory);
    for (const imp of blobFactImports(fact)) {
      const target = queryTargetFromImport(
        package_name,
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
        package_name: importerPkg,
        file_path: localPath,
        repo_path: entry.path,
      });
    }
  }

  for (const [eKey, row] of byKey) {
    const pkgs = entityPackages.get(eKey);
    row.used_by_packages = pkgs
      ? [...pkgs].sort((a, b) => a.localeCompare(b))
      : [];

    const byLeaf = queryUsedBy.get(eKey);
    if (!byLeaf) continue;
    for (const q of row.queries) {
      const leaf = stripTsExt(q.file_name);
      const used = byLeaf.get(leaf);
      if (!used) continue;
      q.used_by = [...used.values()].sort(
        (a, b) =>
          a.package_name.localeCompare(b.package_name) ||
          a.file_path.localeCompare(b.file_path),
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
  package_name: string,
  inventory: PackageDbInventory,
): Array<{
  package_name: string;
  table_name: string;
  export_name: string;
  file_path: string;
  docstring: string | null;
  columns: Array<{
    sql_name: string;
    type_kind: string;
    prop_name: string;
    docstring: string | null;
  }>;
}> {
  const out: Array<{
    package_name: string;
    table_name: string;
    export_name: string;
    file_path: string;
    docstring: string | null;
    columns: Array<{
      sql_name: string;
      type_kind: string;
      prop_name: string;
      docstring: string | null;
    }>;
  }> = [];
  for (const e of inventory.entities) {
    if (!e.table) continue;
    out.push({
      package_name,
      table_name: e.table.table_name,
      export_name: e.table.export_name,
      file_path: e.table.file_path,
      docstring: e.table.docstring,
      columns: e.table.columns,
    });
  }
  return out;
}
