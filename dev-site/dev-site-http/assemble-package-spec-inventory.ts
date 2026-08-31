/**
 * Assemble OpenAPI schemas + REST resources for one spec package,
 * joined to HTTP handlers and SDK requests that depend on it.
 */
import type { DbKey } from "@saflib/drizzle";
import type { ReturnsError } from "@saflib/monorepo";
import { classifySafPackage, parseSafPackageJson } from "@saflib/monorepo";
import type { GitCommandError } from "@saflib/git";
import { listTree, readBlobs } from "@saflib/git";
import { blobFactImports, blobFactTestCases } from "@saflib/dev-site-db/types";
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
  packagesDependingOn,
  type PackageManifest,
} from "./package-manifests.ts";
import {
  buildSpecInventoryFromFiles,
  type PackageSpecInventory,
  type SpecInventoryFileRef,
  type SpecInventoryTestSpec,
  type SpecInventoryUsedBy,
} from "./spec-inventory-build.ts";

export type {
  PackageSpecInventory,
  SpecEntityPresence,
  SpecInventoryEntity,
  SpecInventoryFileRef,
  SpecInventoryOperation,
  SpecInventorySchema,
  SpecInventoryTestSpec,
  SpecInventoryUsedBy,
} from "./spec-inventory-build.ts";

export {
  buildSpecInventoryFromFiles,
  routeStemFromYamlPath,
  stemsMatch,
  toKebabStem,
} from "./spec-inventory-build.ts";

/**
 * If specifier targets this package's `operations/<id>` or `schemas/<Name>`,
 * return the inventory key kind + name.
 */
function specTargetFromImport(
  package_name: string,
  package_directory: string,
  importerPath: string,
  specifier: string,
): { kind: "operations" | "schemas"; name: string } | null {
  const mod = moduleTargetFromImport(
    package_name,
    package_directory,
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

/** HTTP/SDK packages that depend on this spec package. */
export function servicePackageNamesForSpec(
  specPackageName: string,
  manifests: Parameters<typeof packagesDependingOn>[0],
): {
  http: string[];
  sdk: string[];
} {
  return {
    http: packagesDependingOn(manifests, specPackageName, "http").map(
      (m) => m.package_name,
    ),
    sdk: packagesDependingOn(manifests, specPackageName, "sdk").map(
      (m) => m.package_name,
    ),
  };
}

function handlerTestStem(file_path: string, stem: string): boolean {
  const prefix = `handlers/${stem}`;
  if (file_path === `${prefix}.test.ts` || file_path === `${prefix}.test.tsx`) {
    return true;
  }
  // e.g. handlers/matters/comms/upload-resource.enqueue.test.ts
  return (
    file_path.startsWith(`${prefix}.`) &&
    (file_path.endsWith(".test.ts") || file_path.endsWith(".test.tsx"))
  );
}

/**
 * Assemble OpenAPI business objects + REST resources for one spec package.
 */
export async function assemblePackageSpecInventory(
  dbKey: DbKey,
  commit_hash: string,
  package_name: string,
  options: AnalyzeCommitOptions,
): Promise<ReturnsError<PackageSpecInventory, GitCommandError>> {
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

  const underPackage = (path: string, directory: string) => {
    const d = directory.replace(/\/+$/, "");
    if (!d) return true;
    return path === d || path.startsWith(d + "/");
  };

  const relativeToPackage = (path: string, directory: string) => {
    const prefix = directory ? directory.replace(/\/+$/, "") + "/" : "";
    return prefix && path.startsWith(prefix) ? path.slice(prefix.length) : path;
  };

  const yamlEntries = tree.filter((e) => {
    if (!underPackage(e.path, targetRoot.directory)) return false;
    const rel = relativeToPackage(e.path, targetRoot.directory);
    return (
      rel === "openapi.yaml" ||
      rel.startsWith("routes/") ||
      rel.startsWith("schemas/")
    );
  });

  if (
    !yamlEntries.some(
      (e) => relativeToPackage(e.path, targetRoot.directory) === "openapi.yaml",
    )
  ) {
    return { result: { entities: [] } };
  }

  const yamlBlobs = readBlobs(
    repo_root,
    yamlEntries.map((e) => e.blobHash),
  );
  if (yamlBlobs.error) return { error: yamlBlobs.error };

  const files = new Map<string, string>();
  for (const entry of yamlEntries) {
    const text = yamlBlobs.result.get(entry.blobHash);
    if (text === undefined) continue;
    files.set(relativeToPackage(entry.path, targetRoot.directory), text);
  }

  const inventory = buildSpecInventoryFromFiles(files, "openapi.yaml");

  const manifests: PackageManifest[] = [];
  for (const entry of packageJsonEntries) {
    const text = pkgBlobs.result.get(entry.blobHash);
    if (text === undefined) continue;
    const json = parseSafPackageJson(text);
    const name = nameByPath.get(entry.path);
    if (!json || !name) continue;
    const directory =
      entry.path === "package.json"
        ? ""
        : entry.path.slice(0, -"/package.json".length);
    const classified = classifySafPackage({ ...json, name });
    manifests.push({
      package_name: name,
      directory,
      json,
      kind: classified.kind,
      mixedIdentifiers: classified.mixedIdentifiers,
    });
  }
  const services = servicePackageNamesForSpec(package_name, manifests);
  const httpRoots = services.http
    .map((name) => roots.find((r) => r.package_name === name))
    .filter((r): r is NonNullable<typeof r> => Boolean(r));
  const sdkRoots = services.sdk
    .map((name) => roots.find((r) => r.package_name === name))
    .filter((r): r is NonNullable<typeof r> => Boolean(r));

  const handlerByStem = new Map<string, SpecInventoryFileRef>();
  /** Test file repo paths keyed by route stem (resolved to specs after blob facts). */
  const handlerTestFilesByStem = new Map<
    string,
    Array<{ path: string; blob_hash: string }>
  >();
  for (const httpRoot of httpRoots) {
    for (const entry of tree) {
      if (!underPackage(entry.path, httpRoot.directory)) continue;
      const local = relativeToPackage(entry.path, httpRoot.directory);
      if (!local.startsWith("handlers/")) continue;
      if (local.endsWith(".ts") && !local.includes(".test.")) {
        const stem = local.slice("handlers/".length).replace(/\.tsx?$/, "");
        if (!stem || stem.endsWith("/index") || stem === "index") continue;
        const base = stem.split("/").pop() ?? stem;
        if (
          base.startsWith("_") ||
          base.startsWith("map-") ||
          stem.includes(".logic")
        ) {
          continue;
        }
        handlerByStem.set(stem, { file_path: local, repo_path: entry.path });
      }
    }
    for (const entry of tree) {
      if (!underPackage(entry.path, httpRoot.directory)) continue;
      const local = relativeToPackage(entry.path, httpRoot.directory);
      if (!local.startsWith("handlers/")) continue;
      if (!local.includes(".test.")) continue;
      for (const stem of handlerByStem.keys()) {
        if (!handlerTestStem(local, stem)) continue;
        let list = handlerTestFilesByStem.get(stem);
        if (!list) {
          list = [];
          handlerTestFilesByStem.set(stem, list);
        }
        list.push({ path: entry.path, blob_hash: entry.blobHash });
      }
    }
  }

  const requestByStem = new Map<string, SpecInventoryFileRef>();
  const fakeByStem = new Map<string, SpecInventoryFileRef>();
  for (const sdkRoot of sdkRoots) {
    for (const entry of tree) {
      if (!underPackage(entry.path, sdkRoot.directory)) continue;
      const local = relativeToPackage(entry.path, sdkRoot.directory);
      if (!local.startsWith("requests/")) continue;
      if (!local.endsWith(".ts") && !local.endsWith(".tsx")) continue;
      if (local.includes(".test.")) continue;
      // Aggregator barrels — not per-route modules.
      if (
        local.endsWith("/index.ts") ||
        local.endsWith("/index.tsx") ||
        local.endsWith("/index.fakes.ts") ||
        local.endsWith("/index.fakes.tsx") ||
        local === "requests/index.ts" ||
        local === "requests/index.fakes.ts"
      ) {
        continue;
      }
      if (local.includes(".fake.")) {
        const stem = local
          .slice("requests/".length)
          .replace(/\.fake\.tsx?$/, "");
        if (!stem || stem.includes(".logic")) continue;
        fakeByStem.set(stem, { file_path: local, repo_path: entry.path });
        continue;
      }
      const stem = local.slice("requests/".length).replace(/\.tsx?$/, "");
      if (!stem || stem === "index" || stem.endsWith("/index")) continue;
      if (stem.includes(".logic")) continue;
      requestByStem.set(stem, { file_path: local, repo_path: entry.path });
    }
  }

  for (const e of inventory.entities) {
    for (const op of e.operations) {
      const stem = op.route_stem;
      if (!stem) continue;
      op.handler = handlerByStem.get(stem) ?? null;
      op.request = requestByStem.get(stem) ?? null;
      op.fake = fakeByStem.get(stem) ?? null;
    }
  }

  // Schema used_by: importers of schemas/* (still useful on object cards).
  // Operation used_by: importers of the SDK request module (not operations/*).
  // Handler tests: describe/it specs from colocated HTTP test blobs.
  const allSourceEntries = tree.filter((e) => isSourcePath(e.path));
  const factsResult = await ensureBlobFacts(
    dbKey,
    repo_root,
    allSourceEntries.map((e) => e.blobHash),
  );
  if (factsResult.error) return { error: factsResult.error };
  const facts = factsResult.result;

  const handlerTestsByStem = new Map<string, SpecInventoryTestSpec[]>();
  for (const [stem, files] of handlerTestFilesByStem) {
    const seen = new Set<string>();
    const specs: SpecInventoryTestSpec[] = [];
    for (const file of files) {
      const fact = facts.get(file.blob_hash);
      if (!fact) continue;
      for (const tc of blobFactTestCases(fact)) {
        if (seen.has(tc.fullName)) continue;
        seen.add(tc.fullName);
        specs.push({ full_name: tc.fullName });
      }
    }
    specs.sort((a, b) => a.full_name.localeCompare(b.full_name));
    handlerTestsByStem.set(stem, specs);
  }

  for (const e of inventory.entities) {
    for (const op of e.operations) {
      if (!op.route_stem) {
        op.handler_tests = [];
        continue;
      }
      op.handler_tests = handlerTestsByStem.get(op.route_stem) ?? [];
    }
  }

  const schemaUsedBy = new Map<string, Map<string, SpecInventoryUsedBy>>();
  const sdkUsedBy = new Map<string, Map<string, SpecInventoryUsedBy>>();
  const entityPackages = new Map<string, Set<string>>();

  const schemaToEntityKey = new Map<string, string>();
  const stemToOps = new Map<
    string,
    Array<{ entityKey: string; operation_id: string }>
  >();
  for (const e of inventory.entities) {
    if (e.schema) schemaToEntityKey.set(e.schema.name, e.key);
    for (const op of e.operations) {
      if (!op.route_stem) continue;
      let list = stemToOps.get(op.route_stem);
      if (!list) {
        list = [];
        stemToOps.set(op.route_stem, list);
      }
      list.push({ entityKey: e.key, operation_id: op.operation_id });
    }
  }

  for (const entry of allSourceEntries) {
    const file_name = entry.path.split("/").pop() ?? entry.path;
    if (isTestSourcePath(entry.path, file_name)) continue;
    const fact = facts.get(entry.blobHash);
    if (!fact) continue;
    const importerRoot = packageForPath(entry.path, roots);
    const importerPkg = importerRoot.package_name;
    const localPath = packageLocalPath(entry.path, importerRoot.directory);

    for (const imp of blobFactImports(fact)) {
      const schemaTarget = specTargetFromImport(
        package_name,
        targetRoot.directory,
        entry.path,
        imp.specifier,
      );
      if (schemaTarget?.kind === "schemas") {
        const entityKey = schemaToEntityKey.get(schemaTarget.name);
        if (entityKey) {
          const used: SpecInventoryUsedBy = {
            package_name: importerPkg,
            file_path: localPath,
            repo_path: entry.path,
          };
          const usedKey = `${importerPkg}\0${entry.path}`;
          let byFile = schemaUsedBy.get(schemaTarget.name);
          if (!byFile) {
            byFile = new Map();
            schemaUsedBy.set(schemaTarget.name, byFile);
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

      for (const sdkRoot of sdkRoots) {
        const mod = moduleTargetFromImport(
          sdkRoot.package_name,
          sdkRoot.directory,
          entry.path,
          imp.specifier,
        );
        if (mod?.startsWith("requests/")) {
          const stem = mod.slice("requests/".length);
          const ops = stemToOps.get(stem);
          if (ops?.length) {
            const used: SpecInventoryUsedBy = {
              package_name: importerPkg,
              file_path: localPath,
              repo_path: entry.path,
            };
            const usedKey = `${importerPkg}\0${entry.path}`;
            let byFile = sdkUsedBy.get(stem);
            if (!byFile) {
              byFile = new Map();
              sdkUsedBy.set(stem, byFile);
            }
            byFile.set(usedKey, used);
            for (const { entityKey } of ops) {
              let pkgs = entityPackages.get(entityKey);
              if (!pkgs) {
                pkgs = new Set();
                entityPackages.set(entityKey, pkgs);
              }
              pkgs.add(importerPkg);
            }
            break;
          }
        }
      }
    }
  }

  const sortUsed = (list: SpecInventoryUsedBy[]) =>
    list.sort(
      (a, b) =>
        a.package_name.localeCompare(b.package_name) ||
        a.file_path.localeCompare(b.file_path),
    );

  for (const e of inventory.entities) {
    const pkgs = entityPackages.get(e.key);
    e.used_by_packages = pkgs
      ? [...pkgs].sort((a, b) => a.localeCompare(b))
      : [];

    if (e.schema) {
      const used = schemaUsedBy.get(e.schema.name);
      e.schema.used_by = used ? sortUsed([...used.values()]) : [];
    }
    for (const op of e.operations) {
      if (!op.route_stem) {
        op.used_by = [];
        continue;
      }
      const used = sdkUsedBy.get(op.route_stem);
      op.used_by = used ? sortUsed([...used.values()]) : [];
    }
  }

  inventory.package_directory = targetRoot.directory;
  return { result: inventory };
}

/** Flatten operations for future commit diffs. */
export function flattenInventoryOperations(
  package_name: string,
  inventory: PackageSpecInventory,
): Array<{
  package_name: string;
  operation_id: string;
  method: string;
  path: string;
  yaml_path: string;
  summary: string | null;
}> {
  const out: Array<{
    package_name: string;
    operation_id: string;
    method: string;
    path: string;
    yaml_path: string;
    summary: string | null;
  }> = [];
  for (const e of inventory.entities) {
    for (const op of e.operations) {
      out.push({
        package_name,
        operation_id: op.operation_id,
        method: op.method,
        path: op.path,
        yaml_path: op.yaml_path,
        summary: op.summary,
      });
    }
  }
  return out;
}
