/**
 * Assemble OpenAPI schemas + REST resources for one `-spec` package.
 */
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
} from "./import-resolution.ts";
import {
  buildSpecInventoryFromFiles,
  type PackageSpecInventory,
  type SpecInventoryUsedBy,
} from "./spec-inventory-build.ts";

export type {
  PackageSpecInventory,
  SpecEntityPresence,
  SpecInventoryEntity,
  SpecInventoryOperation,
  SpecInventorySchema,
  SpecInventoryUsedBy,
} from "./spec-inventory-build.ts";

export { buildSpecInventoryFromFiles, stemsMatch, toKebabStem } from "./spec-inventory-build.ts";

/**
 * If specifier targets this package's `operations/<id>` or `schemas/<Name>`,
 * return the inventory key kind + name.
 */
function specTargetFromImport(
  packageName: string,
  packageDirectory: string,
  importerPath: string,
  specifier: string,
): { kind: "operations" | "schemas"; name: string } | null {
  const mod = moduleTargetFromImport(
    packageName,
    packageDirectory,
    importerPath,
    specifier,
  );
  if (!mod) return null;
  const op = /^operations\/([^/]+)/.exec(mod);
  if (op) return { kind: "operations", name: op[1]! };
  const sch = /^schemas\/([^/]+)/.exec(mod);
  if (sch) return { kind: "schemas", name: sch[1]! };
  return null;
}

/**
 * Assemble OpenAPI business objects + REST resources for one spec package.
 */
export async function assemblePackageSpecInventory(
  dbKey: DbKey,
  commitHash: string,
  packageName: string,
  options: AnalyzeCommitOptions,
): Promise<ReturnsError<PackageSpecInventory, GitCommandError>> {
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

  const yamlEntries = tree.filter((e) => {
    if (!underPackage(e.path)) return false;
    const rel = relativeToPackage(e.path);
    return (
      rel === "openapi.yaml" ||
      rel.startsWith("routes/") ||
      rel.startsWith("schemas/")
    );
  });

  if (!yamlEntries.some((e) => relativeToPackage(e.path) === "openapi.yaml")) {
    return { result: { entities: [] } };
  }

  const yamlBlobs = readBlobs(
    repoRoot,
    yamlEntries.map((e) => e.blobHash),
  );
  if (yamlBlobs.error) return { error: yamlBlobs.error };

  const files = new Map<string, string>();
  for (const entry of yamlEntries) {
    const text = yamlBlobs.result.get(entry.blobHash);
    if (text === undefined) continue;
    files.set(relativeToPackage(entry.path), text);
  }

  const inventory = buildSpecInventoryFromFiles(files, "openapi.yaml");

  // usedBy: whole-repo non-test importers of operations/* and schemas/*
  const allSourceEntries = tree.filter((e) => isSourcePath(e.path));
  const factsResult = await ensureBlobFacts(
    dbKey,
    repoRoot,
    allSourceEntries.map((e) => e.blobHash),
  );
  if (factsResult.error) return { error: factsResult.error };
  const facts = factsResult.result;

  const schemaUsedBy = new Map<string, Map<string, SpecInventoryUsedBy>>();
  const opUsedBy = new Map<string, Map<string, SpecInventoryUsedBy>>();
  const entityPackages = new Map<string, Set<string>>();

  const opToEntityKey = new Map<string, string>();
  const schemaToEntityKey = new Map<string, string>();
  for (const e of inventory.entities) {
    if (e.schema) schemaToEntityKey.set(e.schema.name, e.key);
    for (const op of e.operations) {
      opToEntityKey.set(op.operationId, e.key);
    }
  }

  for (const entry of allSourceEntries) {
    const fileName = entry.path.split("/").pop() ?? entry.path;
    if (isTestSourcePath(entry.path, fileName)) continue;
    const fact = facts.get(entry.blobHash);
    if (!fact) continue;
    const importerRoot = packageForPath(entry.path, roots);
    const importerPkg = importerRoot.packageName;
    const localPath = packageLocalPath(entry.path, importerRoot.directory);

    for (const imp of blobFactImports(fact)) {
      const target = specTargetFromImport(
        packageName,
        targetRoot.directory,
        entry.path,
        imp.specifier,
      );
      if (!target) continue;

      const used: SpecInventoryUsedBy = {
        packageName: importerPkg,
        filePath: localPath,
        repoPath: entry.path,
      };
      const usedKey = `${importerPkg}\0${entry.path}`;

      if (target.kind === "schemas") {
        const entityKey = schemaToEntityKey.get(target.name);
        if (!entityKey) continue;
        let byFile = schemaUsedBy.get(target.name);
        if (!byFile) {
          byFile = new Map();
          schemaUsedBy.set(target.name, byFile);
        }
        byFile.set(usedKey, used);

        let pkgs = entityPackages.get(entityKey);
        if (!pkgs) {
          pkgs = new Set();
          entityPackages.set(entityKey, pkgs);
        }
        pkgs.add(importerPkg);
      } else {
        const entityKey = opToEntityKey.get(target.name);
        if (!entityKey) continue;
        let byFile = opUsedBy.get(target.name);
        if (!byFile) {
          byFile = new Map();
          opUsedBy.set(target.name, byFile);
        }
        byFile.set(usedKey, used);

        let pkgs = entityPackages.get(entityKey);
        if (!pkgs) {
          pkgs = new Set();
          entityPackages.set(entityKey, pkgs);
        }
        pkgs.add(importerPkg);
      }
    }
  }

  const sortUsed = (list: SpecInventoryUsedBy[]) =>
    list.sort(
      (a, b) =>
        a.packageName.localeCompare(b.packageName) ||
        a.filePath.localeCompare(b.filePath),
    );

  for (const e of inventory.entities) {
    const pkgs = entityPackages.get(e.key);
    e.usedByPackages = pkgs
      ? [...pkgs].sort((a, b) => a.localeCompare(b))
      : [];

    if (e.schema) {
      const used = schemaUsedBy.get(e.schema.name);
      e.schema.usedBy = used ? sortUsed([...used.values()]) : [];
    }
    for (const op of e.operations) {
      const used = opUsedBy.get(op.operationId);
      op.usedBy = used ? sortUsed([...used.values()]) : [];
    }
  }

  return { result: inventory };
}

/** Flatten operations for future commit diffs. */
export function flattenInventoryOperations(
  packageName: string,
  inventory: PackageSpecInventory,
): Array<{
  packageName: string;
  operationId: string;
  method: string;
  path: string;
  yamlPath: string;
  summary: string | null;
}> {
  const out: Array<{
    packageName: string;
    operationId: string;
    method: string;
    path: string;
    yamlPath: string;
    summary: string | null;
  }> = [];
  for (const e of inventory.entities) {
    for (const op of e.operations) {
      out.push({
        packageName,
        operationId: op.operationId,
        method: op.method,
        path: op.path,
        yamlPath: op.yamlPath,
        summary: op.summary,
      });
    }
  }
  return out;
}
