import type { DbKey } from "@saflib/drizzle";
import {
  resolveRef,
  log,
  currentBranch,
  listRefs,
  mergeBase,
  GitCommandError,
} from "@saflib/git";
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

export interface CheckoutCompare {
  againstRef: string;
  mergeBaseHash: string;
  mergeBaseAnalyzed: boolean;
  mergeBaseMessage: string;
  mergeBaseAuthoredAt: string;
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
  compareCandidates: string[];
  compare?: CheckoutCompare;
}

export type GetCheckoutError = GitCommandError;

export interface GetCheckoutOptions {
  repoRoot: string;
  productRoot?: string;
  mainRef: string;
  /** Local branch/ref to merge-base against; defaults to `mainRef`. */
  compareRef?: string;
}

function buildCompareCandidates(
  branchNames: string[],
  current: string | null,
  mainRef: string,
): string[] {
  const set = new Set(branchNames.filter((name) => name !== current));
  if (branchNames.includes(mainRef)) set.add(mainRef);
  return [...set].sort((a, b) => {
    if (a === mainRef) return -1;
    if (b === mainRef) return 1;
    return a.localeCompare(b);
  });
}

async function resolveCompare(
  dbKey: DbKey,
  options: GetCheckoutOptions,
): Promise<ReturnsError<CheckoutCompare | undefined, GitCommandError>> {
  const explicit = options.compareRef?.trim() ?? "";
  const againstRef = explicit || options.mainRef;
  const mb = mergeBase(options.repoRoot, "HEAD", againstRef);
  if (mb.error) {
    if (explicit) return { error: mb.error };
    return { result: undefined };
  }

  const tipLog = log(options.repoRoot, { ref: mb.result, limit: 1 });
  if (tipLog.error) {
    if (explicit) return { error: tipLog.error };
    return { result: undefined };
  }
  const tip = tipLog.result[0];
  if (!tip) {
    const err = new GitCommandError(
      "merge-base resolved but git log returned no commit",
      { args: ["log", "-n1", mb.result], stderr: "" },
    );
    if (explicit) return { error: err };
    return { result: undefined };
  }

  const existing = await getByHash(dbKey, tip.hash);
  return {
    result: {
      againstRef,
      mergeBaseHash: tip.hash,
      mergeBaseAnalyzed: Boolean(existing.result),
      mergeBaseMessage: tip.subject,
      mergeBaseAuthoredAt: tip.authoredAt,
    },
  };
}

/**
 * Resolve HEAD and report whether that commit is already analyzed, plus packages when it is.
 */
export async function getCheckoutStatus(
  dbKey: DbKey,
  options: GetCheckoutOptions,
): Promise<ReturnsError<CheckoutStatus, GetCheckoutError>> {
  const productRoot = (options.productRoot ?? "").replace(/^\/+|\/+$/g, "");
  const head = resolveRef(options.repoRoot, "HEAD");
  if (head.error) return { error: head.error };

  const branchRes = currentBranch(options.repoRoot);
  if (branchRes.error) return { error: branchRes.error };
  const branch = branchRes.result;

  const refsRes = listRefs(options.repoRoot);
  if (refsRes.error) return { error: refsRes.error };
  const branchNames = refsRes.result
    .filter((r) => r.type === "branch")
    .map((r) => r.name);
  const compareCandidates = buildCompareCandidates(
    branchNames,
    branch,
    options.mainRef,
  );

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

  const compareRes = await resolveCompare(dbKey, options);
  if (compareRes.error) return { error: compareRes.error };
  const compare = compareRes.result;

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
        compareCandidates,
        ...(compare ? { compare } : {}),
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
      compareCandidates,
      ...(compare ? { compare } : {}),
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
