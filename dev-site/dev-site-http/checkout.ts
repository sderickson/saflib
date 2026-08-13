import type { DbKey } from "@saflib/drizzle";
import { resolveRef, log, GitCommandError } from "@saflib/git";
import type { ReturnsError } from "@saflib/monorepo";
import { analyzedCommitsDb } from "@saflib/dev-site-db/queries/analyzed-commits/index";
import { packageMetricsDb } from "@saflib/dev-site-db/queries/package-metrics/index";

export interface CheckoutPackage {
  packageName: string;
  directory: string;
  sourceFiles: number;
  sourceLines: number;
  prodLines: number;
  testLines: number;
  testFiles: number;
}

export interface CheckoutStatus {
  hash: string;
  message: string;
  authoredAt: string;
  analyzed: boolean;
  /** Path prefix used when analyzing (e.g. `products`). Empty = whole repo. */
  productRoot: string;
  packages: CheckoutPackage[];
}

export type GetCheckoutError = GitCommandError;

/**
 * Resolve HEAD and report whether that commit is already analyzed, plus packages when it is.
 */
export async function getCheckoutStatus(
  dbKey: DbKey,
  options: { repoRoot: string; productRoot?: string },
): Promise<ReturnsError<CheckoutStatus, GetCheckoutError>> {
  const productRoot = (options.productRoot ?? "").replace(/^\/+|\/+$/g, "");
  const head = resolveRef(options.repoRoot, "HEAD");
  if (head.error) return { error: head.error };

  const tipLog = log(options.repoRoot, { ref: head.result, limit: 1 });
  if (tipLog.error) return { error: tipLog.error };
  const tip = tipLog.result[0];
  if (!tip) {
    return {
      error: new GitCommandError("HEAD resolved but git log returned no commit", {
        args: ["log", "-n1", head.result],
        stderr: "",
      }),
    };
  }

  const existing = await analyzedCommitsDb.getByHash(dbKey, tip.hash);
  if (!existing.result) {
    return {
      result: {
        hash: tip.hash,
        message: tip.subject,
        authoredAt: tip.authoredAt,
        analyzed: false,
        productRoot,
        packages: [],
      },
    };
  }

  const metrics = (await packageMetricsDb.listByCommit(dbKey, tip.hash)).result!;
  return {
    result: {
      hash: tip.hash,
      message: tip.subject,
      authoredAt: tip.authoredAt,
      analyzed: true,
      productRoot,
      packages: metrics.map((m) => ({
        packageName: m.packageName,
        directory: m.directory,
        sourceFiles: m.sourceFiles,
        sourceLines: m.sourceLines,
        prodLines: m.prodLines,
        testLines: m.testLines,
        testFiles: m.testFiles,
      })),
    },
  };
}
