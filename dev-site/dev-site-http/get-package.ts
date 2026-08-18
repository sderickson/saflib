import type { DbKey } from "@saflib/drizzle";
import {
  checkPackageLayout,
  listPackageJsonExportTargetFiles,
  type ReturnsError,
} from "@saflib/monorepo";
import { AnalyzedCommitNotFoundError } from "@saflib/dev-site-db/errors";
import fs from "node:fs";
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
import type { PackageIssue } from "./package-issues.ts";
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
  repoRoot: string,
  productRoot: string | undefined,
  packageDirectory: string,
): PackageIssue[] {
  const packageRepoPath = joinRepoPath(productRoot, packageDirectory);
  const packageDir = path.join(repoRoot, packageRepoPath || ".");
  return checkPackageLayout({
    packageDir,
    packageRepoPath,
  }).map((i) => ({
    kind: i.kind,
    title: i.title,
    name: i.name,
    kindLabel: i.kindLabel,
    filePath: i.filePath,
    repoPath: i.repoPath,
  }));
}

/**
 * Repo-relative files from live `package.json` `exports` (`main.ts`, `test-app.ts`).
 * Same skip list as `saf-dev-site issues --workdir` so Spec Issues matches CLI.
 */
function collectPublicExportFilePaths(
  repoRoot: string,
  productRoot: string | undefined,
  packageDirectory: string,
): string[] {
  const packageRepoPath = joinRepoPath(productRoot, packageDirectory);
  const pkgJsonPath = path.join(repoRoot, packageRepoPath || ".", "package.json");
  let parsed: { exports?: Record<string, unknown> | string };
  try {
    parsed = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8")) as {
      exports?: Record<string, unknown> | string;
    };
  } catch {
    return [];
  }
  return listPackageJsonExportTargetFiles(parsed.exports).map((rel) =>
    joinRepoPath(packageRepoPath, rel),
  );
}

export interface CommitPackageDetail {
  commitHash: string;
  packageName: string;
  directory: string;
  sourceFiles: number;
  sourceLines: number;
  prodLines: number;
  testLines: number;
  testFiles: number;
  exports: Array<{
    packageName: string;
    filePath: string;
    name: string;
    kind: string;
    signature: string | null;
    docstring: string | null;
    usedBy: ExportUsedBy[];
  }>;
  testCases: Array<{
    packageName: string;
    filePath: string;
    fullName: string;
    subjectName?: string;
    subjectSignature?: string | null;
    subjectDocstring?: string | null;
    subjectFilePath?: string;
    subjectConfidence?: "adjacent" | "package";
  }>;
  dbInventory?: PackageDbInventory;
  specInventory?: PackageSpecInventory;
  /**
   * Working-tree package-layout and oversized-file findings (cheap; package-local).
   * Full dead-code workdir scans belong in `saf-dev-site issues --workdir` / a
   * dedicated Issues fetch — not on every Spec package load.
   */
  layoutIssues?: PackageIssue[];
  /**
   * Files targeted by live `package.json` `exports`. Spec Issues skips these
   * for dead-code (SPA `main.ts` / `test-app.ts` are public API).
   */
  publicExportFilePaths?: string[];
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
  packageName: string,
  repo: RepoReadOptions,
): Promise<GetCommitPackageResult> {
  const commitRes = await getByHash(dbKey, hash);
  if (commitRes.error) {
    return { error: commitRes.error };
  }

  const metricsRes = await listByCommit(dbKey, hash);
  const metrics = (metricsRes.result ?? []).find(
    (m) => m.packageName === packageName,
  );
  if (!metrics) {
    return {
      error: new AnalyzedCommitNotFoundError(
        `Package ${packageName} not found for commit ${hash}`,
      ),
    };
  }

  const repoOpts = {
    repoRoot: repo.repoRoot,
    productRoot: repo.productRoot,
    mainRef: repo.mainRef,
  };

  const symbols = await assemblePackageSymbols(dbKey, hash, packageName, repoOpts);

  const rawExports = symbols.result?.exports ?? [];
  const testCases = symbols.result?.testCases ?? [];

  const manifestsRes = loadPackageManifests(repo.repoRoot, hash);
  const manifests = manifestsRes.result ?? [];
  const byName = manifestByPackageName(manifests);
  const pkgManifest = byName.get(packageName);
  const kind = pkgManifest?.kind ?? "other";

  let dbInventory: PackageDbInventory | undefined;
  let specInventory: PackageSpecInventory | undefined;
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
      packageName,
      repoOpts,
    );
    if (!inv.error) {
      dbInventory = inv.result;
    }
  } else if (isSpec) {
    const inv = await assemblePackageSpecInventory(
      dbKey,
      hash,
      packageName,
      repoOpts,
    );
    if (!inv.error) {
      specInventory = inv.result;
      annotateJobsIfConfigured(specInventory);
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
        specInventory = inv.result;
        annotateJobsIfConfigured(specInventory);
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
        specInventory = inv.result;
        annotateJobsIfConfigured(specInventory);
      }
    }
  }

  // Source Spec: reverse-index importers onto exports. Db/spec packages use
  // inventory usedBy instead (same whole-repo walk). HTTP keeps export usedBy
  // for arbitrary non-route modules.
  let usedByMap = new Map<string, ExportUsedBy[]>();
  if (!isDb && !isSpec) {
    const usedByRes = await assembleExportUsedBy(
      dbKey,
      hash,
      packageName,
      rawExports,
      repoOpts,
    );
    if (!usedByRes.error) usedByMap = usedByRes.result;
  }

  const layoutIssues = collectLiveLayoutIssues(
    repo.repoRoot,
    repo.productRoot,
    metrics.directory,
  );
  const publicExportFilePaths = collectPublicExportFilePaths(
    repo.repoRoot,
    repo.productRoot,
    metrics.directory,
  );

  return {
    result: {
      commitHash: hash,
      packageName: metrics.packageName,
      directory: metrics.directory,
      sourceFiles: metrics.sourceFiles,
      sourceLines: metrics.sourceLines,
      prodLines: metrics.prodLines,
      testLines: metrics.testLines,
      testFiles: metrics.testFiles,
      exports: rawExports.map((e) => ({
        packageName: e.packageName,
        filePath: e.filePath,
        name: e.name,
        kind: e.kind,
        signature: e.signature,
        docstring: e.docstring,
        usedBy: usedByMap.get(exportUsedByKey(e.filePath, e.name)) ?? [],
      })),
      testCases: testCases.map((t) => {
        if (!t.subjectName || !t.subjectConfidence || !t.subjectFilePath) {
          return {
            packageName: t.packageName,
            filePath: t.filePath,
            fullName: t.fullName,
          };
        }
        return {
          packageName: t.packageName,
          filePath: t.filePath,
          fullName: t.fullName,
          subjectName: t.subjectName,
          subjectSignature: t.subjectSignature,
          subjectDocstring: t.subjectDocstring,
          subjectFilePath: t.subjectFilePath,
          subjectConfidence: t.subjectConfidence,
        };
      }),
      ...(dbInventory ? { dbInventory } : {}),
      ...(specInventory ? { specInventory } : {}),
      ...(layoutIssues.length ? { layoutIssues } : {}),
      ...(publicExportFilePaths.length ? { publicExportFilePaths } : {}),
    },
  };
}
