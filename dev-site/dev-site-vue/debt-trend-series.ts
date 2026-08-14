/**
 * Build chronologically ordered debt points along the current branch's
 * first-parent ancestry (including mainline history it branched from).
 */
import type { CommitSummary } from "@saflib/dev-site-spec";

export type DebtKind = "dead-code" | "oversized-file" | "package-layout";

export interface DebtTrendPoint {
  hash: string;
  authoredAt: string;
  debt: number;
  kinds: Record<DebtKind, number>;
  /** Branch segment label for this commit (e.g. `feature/x` or `main`). */
  branch: string;
}

export interface DebtBranchSegment {
  branch: string;
  /** Inclusive start index into points (oldest→newest). */
  startIndex: number;
  /** Inclusive end index into points. */
  endIndex: number;
}

export interface BuildDebtTrendOptions {
  commits: CommitSummary[];
  /** HEAD commit hash (current checkout). */
  headHash: string | null | undefined;
  /** Short name of the current branch, or null when detached. */
  currentBranch: string | null | undefined;
  /** Mainline branch name. Defaults to `main`. */
  mainBranch?: string;
}

function firstParentChain(
  byHash: Map<string, CommitSummary>,
  tipHash: string,
): CommitSummary[] {
  const chain: CommitSummary[] = [];
  const seen = new Set<string>();
  let cur: string | undefined = tipHash;
  while (cur && byHash.has(cur) && !seen.has(cur)) {
    seen.add(cur);
    const commit = byHash.get(cur)!;
    chain.push(commit);
    cur = commit.parentHashes[0];
  }
  return chain;
}

/**
 * Hashes on first-parent history of the newest loaded mainline tip.
 */
function mainlineHashSet(
  commits: CommitSummary[],
  mainBranch: string,
): Set<string> {
  const byHash = new Map(commits.map((c) => [c.hash, c]));
  const mainTips = commits.filter((c) =>
    c.refs.some((r) => r.type === "branch" && r.name === mainBranch),
  );
  let tip =
    mainTips.sort(
      (a, b) =>
        new Date(b.authoredAt).getTime() - new Date(a.authoredAt).getTime(),
    )[0] ?? null;

  if (!tip) {
    const ancestors = commits.filter((c) =>
      c.refs.some((r) => r.isMainAncestor),
    );
    tip =
      ancestors.sort(
        (a, b) =>
          new Date(b.authoredAt).getTime() - new Date(a.authoredAt).getTime(),
      )[0] ?? null;
  }

  if (!tip) return new Set();
  return new Set(firstParentChain(byHash, tip.hash).map((c) => c.hash));
}

function segmentsFromPoints(points: DebtTrendPoint[]): DebtBranchSegment[] {
  if (points.length === 0) return [];
  const segments: DebtBranchSegment[] = [];
  let start = 0;
  for (let i = 1; i <= points.length; i++) {
    if (i === points.length || points[i]!.branch !== points[start]!.branch) {
      segments.push({
        branch: points[start]!.branch,
        startIndex: start,
        endIndex: i - 1,
      });
      start = i;
    }
  }
  return segments;
}

/**
 * Points oldest→newest along HEAD first-parent ancestry, only commits with
 * issue stats, labeled by branch segment.
 *
 * Ancestry walks the full loaded commit graph (so gaps without stats do not
 * truncate the chain); plotted points are filtered to `hasIssueStats`.
 */
export function buildDebtTrendSeries(
  options: BuildDebtTrendOptions,
): { points: DebtTrendPoint[]; segments: DebtBranchSegment[] } {
  const mainBranch = options.mainBranch ?? "main";
  const headHash = options.headHash;
  if (!headHash) {
    return { points: [], segments: [] };
  }

  if (!options.commits.some((c) => c.summaryMetrics.hasIssueStats)) {
    return { points: [], segments: [] };
  }

  const byHash = new Map(options.commits.map((c) => [c.hash, c]));
  if (!byHash.has(headHash)) {
    // HEAD not in the loaded window — nothing to plot for this checkout.
    return { points: [], segments: [] };
  }

  const ancestryNewestFirst = firstParentChain(byHash, headHash).filter(
    (c) => c.summaryMetrics.hasIssueStats,
  );
  if (ancestryNewestFirst.length === 0) {
    return { points: [], segments: [] };
  }

  const mainline = mainlineHashSet(options.commits, mainBranch);
  const featureLabel = options.currentBranch?.trim() || "HEAD";

  const points: DebtTrendPoint[] = [...ancestryNewestFirst]
    .reverse()
    .map((c) => {
      const kinds = c.summaryMetrics.issueCountsByKind;
      const onMain = mainline.has(c.hash);
      return {
        hash: c.hash,
        authoredAt: c.authoredAt,
        debt: c.summaryMetrics.debtCount ?? 0,
        kinds: {
          "dead-code": kinds["dead-code"] ?? 0,
          "oversized-file": kinds["oversized-file"] ?? 0,
          "package-layout": kinds["package-layout"] ?? 0,
        },
        branch: onMain ? mainBranch : featureLabel,
      };
    });

  return { points, segments: segmentsFromPoints(points) };
}
