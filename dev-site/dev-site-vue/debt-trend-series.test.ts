import { describe, expect, it } from "vitest";
import type { CommitSummary } from "@saflib/dev-site-spec";
import { buildDebtTrendSeries } from "./debt-trend-series.ts";
import { summaryMetricsFixture } from "./test-fixtures.ts";

function commit(
  partial: Partial<CommitSummary> & { hash: string },
): CommitSummary {
  return {
    parent_hashes: [],
    authored_at: "2026-01-01T00:00:00.000Z",
    message: "msg",
    refs: [],
    analyzer_version: "1",
    computed_at: "2026-01-01T01:00:00.000Z",
    status: "complete",
    summary_metrics: summaryMetricsFixture({ has_issue_stats: true }),
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
        parent_hashes: [main2],
        authored_at: "2026-01-03T00:00:00.000Z",
        refs: [{ name: "feat", type: "branch", is_main_ancestor: false }],
        summary_metrics: summaryMetricsFixture({
          debt_count: 3,
          has_issue_stats: true,
          issue_counts_by_kind: {
            "dead-code": 3,
            "oversized-file": 0,
            "package-layout": 0,
          },
        }),
      }),
      commit({
        hash: main2,
        parent_hashes: [main1],
        authored_at: "2026-01-02T00:00:00.000Z",
        refs: [{ name: "main", type: "branch", is_main_ancestor: true }],
        summary_metrics: summaryMetricsFixture({
          debt_count: 1,
          has_issue_stats: true,
        }),
      }),
      commit({
        hash: main1,
        parent_hashes: [],
        authored_at: "2026-01-01T00:00:00.000Z",
        refs: [],
        summary_metrics: summaryMetricsFixture({
          debt_count: 0,
          has_issue_stats: true,
        }),
      }),
      commit({
        hash: other,
        parent_hashes: [main1],
        authored_at: "2026-01-04T00:00:00.000Z",
        refs: [{ name: "other", type: "branch", is_main_ancestor: false }],
        summary_metrics: summaryMetricsFixture({
          debt_count: 9,
          has_issue_stats: true,
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
        parent_hashes: [b],
        authored_at: "2026-01-03T00:00:00.000Z",
        refs: [{ name: "main", type: "branch", is_main_ancestor: true }],
        summary_metrics: summaryMetricsFixture({
          debt_count: 2,
          has_issue_stats: true,
        }),
      }),
      commit({
        hash: b,
        parent_hashes: [a],
        authored_at: "2026-01-02T00:00:00.000Z",
        summary_metrics: summaryMetricsFixture({ has_issue_stats: false }),
      }),
      commit({
        hash: a,
        parent_hashes: [],
        authored_at: "2026-01-01T00:00:00.000Z",
        summary_metrics: summaryMetricsFixture({
          debt_count: 1,
          has_issue_stats: true,
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
