import { describe, expect, it } from "vitest";
import type { CommitSummary } from "@saflib/dev-site-spec";
import { buildDebtTrendSeries } from "./debt-trend-series.ts";
import { summaryMetricsFixture } from "./test-fixtures.ts";

function commit(
  partial: Partial<CommitSummary> & { hash: string },
): CommitSummary {
  return {
    parentHashes: [],
    authoredAt: "2026-01-01T00:00:00.000Z",
    message: "msg",
    refs: [],
    analyzerVersion: "1",
    computedAt: "2026-01-01T01:00:00.000Z",
    status: "complete",
    summaryMetrics: summaryMetricsFixture({ hasIssueStats: true }),
    ...partial,
  };
}

describe("buildDebtTrendSeries", () => {
  it("returns empty without head", () => {
    expect(
      buildDebtTrendSeries({
        commits: [commit({ hash: "a".repeat(40) })],
        headHash: null,
        currentBranch: "feat",
      }).points,
    ).toEqual([]);
  });

  it("keeps only first-parent ancestry with stats, oldest first", () => {
    const main1 = "1111111111111111111111111111111111111111";
    const main2 = "2222222222222222222222222222222222222222";
    const feat = "3333333333333333333333333333333333333333";
    const other = "4444444444444444444444444444444444444444";

    const commits = [
      commit({
        hash: feat,
        parentHashes: [main2],
        authoredAt: "2026-01-03T00:00:00.000Z",
        refs: [{ name: "feat", type: "branch", isMainAncestor: false }],
        summaryMetrics: summaryMetricsFixture({
          debtCount: 3,
          hasIssueStats: true,
          issueCountsByKind: {
            "dead-code": 3,
            "same-file-only-export": 0,
            "oversized-file": 0,
            "package-layout": 0,
          },
        }),
      }),
      commit({
        hash: main2,
        parentHashes: [main1],
        authoredAt: "2026-01-02T00:00:00.000Z",
        refs: [{ name: "main", type: "branch", isMainAncestor: true }],
        summaryMetrics: summaryMetricsFixture({
          debtCount: 1,
          hasIssueStats: true,
        }),
      }),
      commit({
        hash: main1,
        parentHashes: [],
        authoredAt: "2026-01-01T00:00:00.000Z",
        refs: [],
        summaryMetrics: summaryMetricsFixture({
          debtCount: 0,
          hasIssueStats: true,
        }),
      }),
      commit({
        hash: other,
        parentHashes: [main1],
        authoredAt: "2026-01-04T00:00:00.000Z",
        refs: [{ name: "other", type: "branch", isMainAncestor: false }],
        summaryMetrics: summaryMetricsFixture({
          debtCount: 9,
          hasIssueStats: true,
        }),
      }),
    ];

    const { points, segments } = buildDebtTrendSeries({
      commits,
      headHash: feat,
      currentBranch: "feat",
      mainBranch: "main",
    });

    expect(points.map((p) => p.hash)).toEqual([main1, main2, feat]);
    expect(points.map((p) => p.branch)).toEqual(["main", "main", "feat"]);
    expect(segments).toEqual([
      { branch: "main", startIndex: 0, endIndex: 1 },
      { branch: "feat", startIndex: 2, endIndex: 2 },
    ]);
  });

  it("skips commits without issue stats but walks through gaps", () => {
    const a = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const b = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
    const c = "cccccccccccccccccccccccccccccccccccccccc";
    const commits = [
      commit({
        hash: c,
        parentHashes: [b],
        authoredAt: "2026-01-03T00:00:00.000Z",
        refs: [{ name: "main", type: "branch", isMainAncestor: true }],
        summaryMetrics: summaryMetricsFixture({
          debtCount: 2,
          hasIssueStats: true,
        }),
      }),
      commit({
        hash: b,
        parentHashes: [a],
        authoredAt: "2026-01-02T00:00:00.000Z",
        summaryMetrics: summaryMetricsFixture({ hasIssueStats: false }),
      }),
      commit({
        hash: a,
        parentHashes: [],
        authoredAt: "2026-01-01T00:00:00.000Z",
        summaryMetrics: summaryMetricsFixture({
          debtCount: 1,
          hasIssueStats: true,
        }),
      }),
    ];

    const { points } = buildDebtTrendSeries({
      commits,
      headHash: c,
      currentBranch: "main",
    });
    expect(points.map((p) => p.hash)).toEqual([a, c]);
  });
});
