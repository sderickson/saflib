import type { DbKey } from "@saflib/drizzle";
import { resolveRef, log, currentBranch, GitCommandError } from "@saflib/git";
import type { ReturnsError } from "@saflib/monorepo";
import {
  debtCountFromIssueCounts,
  emptyIssueCountsByKind,
  type IssueCountsByKind,
} from "./package-issues.ts";

import { getByHash } from "@saflib/dev-site-db/queries/analyzed-commits/get-by-hash";
import { listByCommit } from "@saflib/dev-site-db/queries/package-metrics/list-by-commit";
import { listByCommit as listIssueStats } from "@saflib/dev-site-db/queries/package-issue-stats/list-by-commit";
import { rollupIssueCounts } from "./issue-stats-rollup.ts";

export interface CheckoutPackage {
  packageName: string;
  directory: string;
  sourceFiles: number;
  sourceLines: number;
  prodLines: number;
  testLines: number;
  testFiles: number;
  issueCountsByKind: IssueCountsByKind;
  debtCount: number;
}

export interface CheckoutStatus {
  hash: string;
  message: string;
  authoredAt: string;
  analyzed: boolean;
  /** Path prefix used when analyzing (e.g. `products`). Empty = whole repo. */
  productRoot: string;
  /** Short branch name for HEAD, or null when detached. */
  branch: string | null;
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

  const branchRes = currentBranch(options.repoRoot);
  if (branchRes.error) return { error: branchRes.error };
  const branch = branchRes.result;

  const tipLog = log(options.repoRoot, { ref: head.result, limit: 1 });
  if (tipLog.error) return { error: tipLog.error };
  const tip = tipLog.result[0];
  if (!tip) {
    return {
      error: new GitCommandError(
        "HEAD resolved but git log returned no commit",
        {
          args: ["log", "-n1", head.result],
          stderr: "",
        },
      ),
    };
  }

  const existing = await getByHash(dbKey, tip.hash);
  if (!existing.result) {
    return {
      result: {
        hash: tip.hash,
        message: tip.subject,
        authoredAt: tip.authoredAt,
        analyzed: false,
        productRoot,
        branch,
        packages: [],
      },
    };
  }

  const metrics = (await listByCommit(dbKey, tip.hash)).result!;
  const issueRows = (await listIssueStats(dbKey, tip.hash)).result ?? [];
  const { byPackage } = rollupIssueCounts(issueRows);

  return {
    result: {
      hash: tip.hash,
      message: tip.subject,
      authoredAt: tip.authoredAt,
      analyzed: true,
      productRoot,
      branch,
      packages: metrics.map((m) => {
        const issueCountsByKind =
          byPackage.get(m.packageName) ?? emptyIssueCountsByKind();
        return {
          packageName: m.packageName,
          directory: m.directory,
          sourceFiles: m.sourceFiles,
          sourceLines: m.sourceLines,
          prodLines: m.prodLines,
          testLines: m.testLines,
          testFiles: m.testFiles,
          issueCountsByKind,
          debtCount: debtCountFromIssueCounts(issueCountsByKind),
        };
      }),
    },
  };
}
