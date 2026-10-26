import { describe, expect, it } from "vitest";
import { buildScanProgress, SCAN_PHASES } from "./scan-progress.ts";

const commit = { hash: "abc", index: 1, count: 1 };

describe("buildScanProgress", () => {
  it("starts at zero and grows through the phases in order", () => {
    const fractions = SCAN_PHASES.map(
      (phase) => buildScanProgress(commit, phase, 0, 0).fraction,
    );
    expect(fractions[0]).toBe(0);
    for (let i = 1; i < fractions.length; i++) {
      expect(fractions[i]).toBeGreaterThan(fractions[i - 1]!);
    }
  });

  it("moves within a phase by done/total", () => {
    const start = buildScanProgress(commit, "check-issues", 0, 80).fraction;
    const half = buildScanProgress(commit, "check-issues", 40, 80).fraction;
    const next = buildScanProgress(commit, "save", 0, 0).fraction;
    expect(half).toBeGreaterThan(start);
    expect(half).toBeLessThan(next);
  });

  it("splits a multi-commit job evenly across commits", () => {
    const second = buildScanProgress(
      { hash: "def", index: 2, count: 4 },
      "list-files",
      0,
      0,
    );
    expect(second.fraction).toBe(0.25);
    expect(second.phase_label).toBe("Listing files");
    expect(second.phase_index).toBe(1);
  });
});
