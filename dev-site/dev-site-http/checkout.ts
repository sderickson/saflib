import type { DbKey } from "@saflib/drizzle";
import {
  resolveRef,
  log,
  currentBranch,
  listRefs,
  mergeBase,
  listRenames,
  GitCommandError,
} from "@saflib/git";
import type { PackageKind, ReturnsError } from "@saflib/monorepo";
import {
  debtCountFromIssueCounts,
  emptyIssueCountsByKind,
  type IssueCountsByKind,
} from "./package-issues.ts";
import {
  loadPackageManifests,
  manifestByRepoDirectory,
} from "./package-manifests.ts";

import { getByHash } from "@saflib/dev-site-db/queries/analyzed-commits/get-by-hash";
import { listByCommit } from "@saflib/dev-site-db/queries/package-metrics/list-by-commit";
import { listByCommit as listIssueStats } from "@saflib/dev-site-db/queries/package-issue-stats/list-by-commit";
import { rollupIssueCounts } from "./issue-stats-rollup.ts";
import { toApiRename } from "./wire-maps.ts";

export interface CheckoutPackage {
  package_name: string;
  directory: string;
  kind?: PackageKind;
  source_files: number;
  source_lines: number;
  prod_lines: number;
  test_lines: number;
  test_files: number;
  issue_counts_by_kind: IssueCountsByKind;
  debt_count: number;
}

export interface CheckoutPathRename {
  from_path: string;
  to_path: string;
  score?: number;
}

export interface CheckoutCompare {
  against_ref: string;
  merge_base_hash: string;
  merge_base_analyzed: boolean;
  merge_base_message: string;
  merge_base_authored_at: string;
  renames: CheckoutPathRename[];
}

export interface CheckoutStatus {
  hash: string;
  message: string;
  authored_at: string;
  analyzed: boolean;
  /** Path prefix used when analyzing (e.g. `products`). Empty = whole repo. */
  product_root: string;
  /** Short branch name for HEAD, or null when detached. */
  branch: string | null;
  packages: CheckoutPackage[];
  compare_candidates: string[];
  compare?: CheckoutCompare;
}

export type GetCheckoutError = GitCommandError;

export interface GetCheckoutOptions {
  repo_root: string;
  product_root?: string;
  mainRef: string;
  /** Local branch/ref to merge-base against; defaults to `mainRef`. */
  compare_ref?: string;
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
  const explicit = options.compare_ref?.trim() ?? "";
  const against_ref = explicit || options.mainRef;
  const mb = mergeBase(options.repo_root, "HEAD", against_ref);
  if (mb.error) {
    if (explicit) return { error: mb.error };
    return { result: undefined };
  }

  const tipLog = log(options.repo_root, { ref: mb.result, limit: 1 });
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
  const renamed = listRenames(options.repo_root, mb.result, "HEAD");
  return {
    result: {
      against_ref,
      merge_base_hash: tip.hash,
      merge_base_analyzed: Boolean(existing.result),
      merge_base_message: tip.subject,
      merge_base_authored_at: tip.authoredAt,
      renames: (renamed.result ?? []).map(toApiRename),
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
  const product_root = (options.product_root ?? "").replace(/^\/+|\/+$/g, "");
  const head = resolveRef(options.repo_root, "HEAD");
  if (head.error) return { error: head.error };

  const branchRes = currentBranch(options.repo_root);
  if (branchRes.error) return { error: branchRes.error };
  const branch = branchRes.result;

  const refsRes = listRefs(options.repo_root);
  if (refsRes.error) return { error: refsRes.error };
  const branchNames = refsRes.result
    .filter((r) => r.type === "branch")
    .map((r) => r.name);
  const compare_candidates = buildCompareCandidates(
    branchNames,
    branch,
    options.mainRef,
  );

  const tipLog = log(options.repo_root, { ref: head.result, limit: 1 });
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
        authored_at: tip.authoredAt,
        analyzed: false,
        product_root,
        branch,
        packages: [],
        compare_candidates,
        ...(compare ? { compare } : {}),
      },
    };
  }

  const metrics = (await listByCommit(dbKey, tip.hash)).result!;
  const issueRows = (await listIssueStats(dbKey, tip.hash)).result ?? [];
  const { byPackage } = rollupIssueCounts(issueRows);
  const manifestsRes = loadPackageManifests(options.repo_root, tip.hash);
  const byDir = manifestByRepoDirectory(manifestsRes.result ?? []);

  return {
    result: {
      hash: tip.hash,
      message: tip.subject,
      authored_at: tip.authoredAt,
      analyzed: true,
      product_root,
      branch,
      compare_candidates,
      ...(compare ? { compare } : {}),
      packages: metrics.map((m) => {
        const issue_counts_by_kind =
          byPackage.get(m.package_name) ?? emptyIssueCountsByKind();
        const repoDir = [product_root, m.directory]
          .map((p) => p.replace(/^\/+|\/+$/g, ""))
          .filter(Boolean)
          .join("/");
        const kind = byDir.get(repoDir)?.kind ?? "other";
        return {
          package_name: m.package_name,
          directory: m.directory,
          kind,
          source_files: m.source_files,
          source_lines: m.source_lines,
          prod_lines: m.prod_lines,
          test_lines: m.test_lines,
          test_files: m.test_files,
          issue_counts_by_kind,
          debt_count: debtCountFromIssueCounts(issue_counts_by_kind),
        };
      }),
    },
  };
}
