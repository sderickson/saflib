import type { DbKey } from "@saflib/drizzle";
import type { ReturnsError } from "@saflib/monorepo";
import { AnalyzedCommitNotFoundError } from "@saflib/dev-site-db/errors";
import { analyzedCommitsDb } from "@saflib/dev-site-db/queries/analyzed-commits/index";
import { packageMetricsDb } from "@saflib/dev-site-db/queries/package-metrics/index";
import { assemblePackageSymbols } from "./analyze-commit.ts";
import type { RepoReadOptions } from "./get-commit.ts";

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
  const commitRes = await analyzedCommitsDb.getByHash(dbKey, hash);
  if (commitRes.error) {
    return { error: commitRes.error };
  }

  const metricsRes = await packageMetricsDb.listByCommit(dbKey, hash);
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

  const symbols = await assemblePackageSymbols(dbKey, hash, packageName, {
    repoRoot: repo.repoRoot,
    productRoot: repo.productRoot,
    mainRef: repo.mainRef,
  });

  const exports = symbols.result?.exports ?? [];
  const testCases = symbols.result?.testCases ?? [];

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
      exports: exports.map((e) => ({
        packageName: e.packageName,
        filePath: e.filePath,
        name: e.name,
        kind: e.kind,
        signature: e.signature,
        docstring: e.docstring,
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
    },
  };
}
