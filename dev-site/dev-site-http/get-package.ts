import type { DbKey } from "@saflib/drizzle";
import type { ReturnsError } from "@saflib/monorepo";
import { AnalyzedCommitNotFoundError } from "@saflib/dev-site-db/errors";

import { assemblePackageSymbols } from "./analyze-commit.ts";
import { assemblePackageDbInventory } from "./assemble-package-db-inventory.ts";
import { assemblePackageSpecInventory } from "./assemble-package-spec-inventory.ts";
import {
  assembleExportUsedBy,
  exportUsedByKey,
  type ExportUsedBy,
} from "./assemble-export-used-by.ts";
import { looksLikeDbPackage, looksLikeSpecPackage } from "./classify.ts";
import type { RepoReadOptions } from "./get-commit.ts";
import type { PackageDbInventory } from "./assemble-package-db-inventory.ts";
import type { PackageSpecInventory } from "./assemble-package-spec-inventory.ts";

import { getByHash } from "@saflib/dev-site-db/queries/analyzed-commits/get-by-hash";
import { listByCommit } from "@saflib/dev-site-db/queries/package-metrics/list-by-commit";
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

  let dbInventory: PackageDbInventory | undefined;
  let specInventory: PackageSpecInventory | undefined;
  const isDb = looksLikeDbPackage(metrics.packageName, metrics.directory);
  const isSpec = looksLikeSpecPackage(metrics.packageName, metrics.directory);
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
    }
  }

  // Source Spec: reverse-index importers onto exports. Db/spec packages use
  // inventory usedBy instead (same whole-repo walk).
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
    },
  };
}
