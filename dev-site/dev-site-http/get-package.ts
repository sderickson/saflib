import type { DbKey } from "@saflib/drizzle";
import { checkPackageLayout } from "@saflib/monorepo";
import { collectPublicExportRepoPaths } from "@saflib/monorepo/exports";
import type { ReturnsError } from "@saflib/utils";
import { AnalyzedCommitNotFoundError } from "@saflib/dev-site-db/errors";
import path from "node:path";

import { assemblePackageSymbols } from "./analyze-commit.ts";
import { assemblePackageDbInventory } from "./assemble-package-db-inventory.ts";
import {
  assembleExportUsedBy,
  exportUsedByKey,
  type ExportUsedBy,
} from "./assemble-export-used-by.ts";
import type { RepoReadOptions } from "./get-commit.ts";
import type { PackageDbInventory } from "./assemble-package-db-inventory.ts";
import {
  assemblePackageSpecInventory,
  type PackageSpecInventory,
} from "./assemble-package-spec-inventory.ts";
import {
  toApiPackageIssues,
  toApiUsedByList,
  type ApiPackageIssue,
  type ApiUsedBy,
} from "./wire-maps.ts";
import { annotateSpecInventoryJobEdges } from "./annotate-spec-inventory-jobs.ts";
import { devSiteHttpStorage } from "./context.ts";
import {
  loadPackageManifests,
  manifestByPackageName,
  specPackageNamesFromDeps,
} from "./package-manifests.ts";

import { getByHash } from "@saflib/dev-site-db/queries/analyzed-commits/get-by-hash";
import { listByCommit } from "@saflib/dev-site-db/queries/package-metrics/list-by-commit";

function annotateJobsIfConfigured(
  inventory: PackageSpecInventory | undefined,
): void {
  if (!inventory) return;
  const triggerMap = devSiteHttpStorage.getStore()?.jobTriggerMap;
  if (!triggerMap) return;
  annotateSpecInventoryJobEdges(inventory, triggerMap);
}

function joinRepoPath(...parts: Array<string | undefined>): string {
  return parts
    .map((p) => (p ?? "").replace(/^\/+|\/+$/g, ""))
    .filter(Boolean)
    .join("/");
}

/** Fast live layout/LoC only — do not run full workdir dead-code here (multi-second). */
function collectLiveLayoutIssues(
  repo_root: string,
  product_root: string | undefined,
  package_directory: string,
): ApiPackageIssue[] {
  const packageRepoPath = joinRepoPath(product_root, package_directory);
  const packageDir = path.join(repo_root, packageRepoPath || ".");
  return toApiPackageIssues(
    checkPackageLayout({
      packageDir,
      packageRepoPath,
    }),
  );
}

/**
 * Repo-relative public export targets from live `package.json` (patterns, Vue).
 * Same logic as `saf-dev-site issues --workdir` / `saf-analyze-package`.
 */
function collectPublicExportFilePaths(
  repo_root: string,
  product_root: string | undefined,
  package_directory: string,
): string[] {
  const packageRepoPath = joinRepoPath(product_root, package_directory);
  const packageDir = path.join(repo_root, packageRepoPath || ".");
  return collectPublicExportRepoPaths(packageDir, packageRepoPath);
}

export interface CommitPackageDetail {
  commit_hash: string;
  package_name: string;
  directory: string;
  source_files: number;
  source_lines: number;
  prod_lines: number;
  test_lines: number;
  test_files: number;
  exports: Array<{
    package_name: string;
    file_path: string;
    name: string;
    kind: string;
    signature: string | null;
    docstring: string | null;
    used_by: ApiUsedBy[];
  }>;
  test_cases: Array<{
    package_name: string;
    file_path: string;
    full_name: string;
    subject_name?: string;
    subject_signature?: string | null;
    subject_docstring?: string | null;
    subject_file_path?: string;
    subject_confidence?: "adjacent" | "package";
  }>;
  db_inventory?: PackageDbInventory;
  spec_inventory?: PackageSpecInventory;
  /**
   * Working-tree package-layout and oversized-file findings (cheap; package-local).
   * Full dead-code workdir scans belong in `saf-dev-site issues --workdir` / a
   * dedicated Issues fetch — not on every Spec package load.
   */
  layout_issues?: ApiPackageIssue[];
  /**
   * Files targeted by live `package.json` `exports`. Spec Issues skips these
   * for dead-code (SPA `main.ts` / `test-app.ts` are public API).
   */
  public_export_file_paths?: string[];
}

export type GetCommitPackageError = AnalyzedCommitNotFoundError;

export type GetCommitPackageResult = ReturnsError<
  CommitPackageDetail,
  GetCommitPackageError
>;

/**
 * Package-scoped commit detail for the checkout Spec panel.
 * Assembles exports/tests only under that package's directory.
 */
export async function getCommitPackage(
  dbKey: DbKey,
  hash: string,
  package_name: string,
  repo: RepoReadOptions,
): Promise<GetCommitPackageResult> {
  const commitRes = await getByHash(dbKey, hash);
  if (commitRes.error) {
    return { error: commitRes.error };
  }

  const metricsRes = await listByCommit(dbKey, hash);
  const metrics = (metricsRes.result ?? []).find(
    (m) => m.package_name === package_name,
  );
  if (!metrics) {
    return {
      error: new AnalyzedCommitNotFoundError(
        `Package ${package_name} not found for commit ${hash}`,
      ),
    };
  }

  const repoOpts = {
    repo_root: repo.repo_root,
    product_root: repo.product_root,
    mainRef: repo.mainRef,
  };

  const symbols = await assemblePackageSymbols(dbKey, hash, package_name, repoOpts);

  const rawExports = symbols.result?.exports ?? [];
  const test_cases = symbols.result?.test_cases ?? [];

  const manifestsRes = loadPackageManifests(repo.repo_root, hash);
  const manifests = manifestsRes.result ?? [];
  const byName = manifestByPackageName(manifests);
  const pkgManifest = byName.get(package_name);
  const kind = pkgManifest?.kind ?? "other";

  let db_inventory: PackageDbInventory | undefined;
  let spec_inventory: PackageSpecInventory | undefined;
  const isDb = kind === "db";
  const isSpec = kind === "spec";
  const isHttp = kind === "http";
  const isSdk = kind === "sdk";
  const isSpa = kind === "spa";
  const hasVue = symbols.result?.hasVue ?? false;
  if (isDb) {
    const inv = await assemblePackageDbInventory(
      dbKey,
      hash,
      package_name,
      repoOpts,
    );
    if (!inv.error) {
      db_inventory = inv.result;
    }
  } else if (isSpec) {
    const inv = await assemblePackageSpecInventory(
      dbKey,
      hash,
      package_name,
      repoOpts,
    );
    if (!inv.error) {
      spec_inventory = inv.result;
      annotateJobsIfConfigured(spec_inventory);
    }
  } else if (isHttp || isSdk) {
    const specName = specPackageNamesFromDeps(byName, pkgManifest)[0];
    if (specName) {
      const inv = await assemblePackageSpecInventory(
        dbKey,
        hash,
        specName,
        repoOpts,
      );
      if (!inv.error) {
        spec_inventory = inv.result;
        annotateJobsIfConfigured(spec_inventory);
      }
    }
  } else if (isSpa || hasVue) {
    const counts = new Map<string, number>();
    for (const imp of symbols.result?.sdkRequestImports ?? []) {
      const sdkManifest = byName.get(imp.sdkPackageName);
      for (const specName of specPackageNamesFromDeps(byName, sdkManifest)) {
        counts.set(specName, (counts.get(specName) ?? 0) + 1);
      }
    }
    const specName = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    if (specName) {
      const inv = await assemblePackageSpecInventory(
        dbKey,
        hash,
        specName,
        repoOpts,
      );
      if (!inv.error) {
        spec_inventory = inv.result;
        annotateJobsIfConfigured(spec_inventory);
      }
    }
  }

  // Source Spec: reverse-index importers onto exports. Db/spec packages use
  // inventory used_by instead (same whole-repo walk). HTTP keeps export used_by
  // for arbitrary non-route modules.
  let usedByMap = new Map<string, ExportUsedBy[]>();
  if (!isDb && !isSpec) {
    const usedByRes = await assembleExportUsedBy(
      dbKey,
      hash,
      package_name,
      rawExports,
      repoOpts,
    );
    if (!usedByRes.error) usedByMap = usedByRes.result;
  }

  const layout_issues = collectLiveLayoutIssues(
    repo.repo_root,
    repo.product_root,
    metrics.directory,
  );
  const public_export_file_paths = collectPublicExportFilePaths(
    repo.repo_root,
    repo.product_root,
    metrics.directory,
  );

  return {
    result: {
      commit_hash: hash,
      package_name: metrics.package_name,
      directory: metrics.directory,
      source_files: metrics.source_files,
      source_lines: metrics.source_lines,
      prod_lines: metrics.prod_lines,
      test_lines: metrics.test_lines,
      test_files: metrics.test_files,
      exports: rawExports.map((e) => ({
        package_name: e.package_name,
        file_path: e.file_path,
        name: e.name,
        kind: e.kind,
        signature: e.signature,
        docstring: e.docstring,
        used_by: toApiUsedByList(
          usedByMap.get(exportUsedByKey(e.file_path, e.name)),
        ),
      })),
      test_cases: test_cases.map((t) => {
        if (!t.subject_name || !t.subject_confidence || !t.subject_file_path) {
          return {
            package_name: t.package_name,
            file_path: t.file_path,
            full_name: t.full_name,
          };
        }
        return {
          package_name: t.package_name,
          file_path: t.file_path,
          full_name: t.full_name,
          subject_name: t.subject_name,
          subject_signature: t.subject_signature,
          subject_docstring: t.subject_docstring,
          subject_file_path: t.subject_file_path,
          subject_confidence: t.subject_confidence,
        };
      }),
      ...(db_inventory ? { db_inventory } : {}),
      ...(spec_inventory ? { spec_inventory } : {}),
      ...(layout_issues.length ? { layout_issues } : {}),
      ...(public_export_file_paths.length ? { public_export_file_paths } : {}),
    },
  };
}
