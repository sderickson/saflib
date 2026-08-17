import { describe, it, expect } from "vitest";
import { commitHealth } from "./health.ts";
import type { CommitSummary } from "@saflib/dev-site-spec";
import { summaryMetricsFixture } from "./test-fixtures.ts";

function summary(
  sourceLines: number,
  testLines: number,
): Pick<CommitSummary, "summaryMetrics"> {
  return {
    summaryMetrics: summaryMetricsFixture({
      sourceLines,
      testLines,
      testFiles: testLines > 0 ? 1 : 0,
    }),
  };
}

describe("commitHealth", () => {
  it("marks empty when there is no source", () => {
    expect(commitHealth(summary(0, 0)).status).toBe("empty");
  });

  it("marks untested when source has zero test LOC", () => {
    expect(commitHealth(summary(100, 0)).status).toBe("untested");
  });

  it("marks healthy at or above 20% test/source LOC", () => {
    expect(commitHealth(summary(100, 20)).status).toBe("healthy");
    expect(commitHealth(summary(100, 50)).status).toBe("healthy");
  });

  it("marks thin when tests exist but are below the ratio", () => {
    expect(commitHealth(summary(100, 10)).status).toBe("thin");
  });
});
