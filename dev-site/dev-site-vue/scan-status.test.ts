import { describe, expect, it } from "vitest";
import { describeScanStatus } from "./scan-status.ts";
import type { ScanJob } from "./requests/scan-jobs.ts";

const HASH = "a".repeat(40);

function job(partial: Partial<ScanJob>): ScanJob {
  return {
    id: partial.id ?? "job",
    status: "queued",
    created_at: "2026-10-23T00:00:00.000Z",
    ...partial,
  };
}

describe("describeScanStatus", () => {
  it("is null when nothing is active", () => {
    expect(describeScanStatus([])).toBeNull();
    expect(describeScanStatus([job({ status: "complete" })])).toBeNull();
  });

  it("is indeterminate while only queued", () => {
    expect(describeScanStatus([job({ status: "queued" })])).toEqual({
      label: "Scan queued",
      percent: 0,
      indeterminate: true,
    });
  });

  it("names the commit, phase, counts and step of the running job", () => {
    const status = describeScanStatus([
      job({ id: "next", status: "queued" }),
      job({
        status: "running",
        progress: {
          commit_hash: HASH,
          commit_index: 1,
          commit_count: 1,
          phase: "check-issues",
          phase_label: "Checking package issues",
          phase_index: 4,
          phase_count: 5,
          done: 40,
          total: 80,
          fraction: 0.725,
        },
      }),
    ]);
    expect(status).toEqual({
      label:
        "Scanning aaaaaaaaaa · Checking package issues 40/80 (step 4/5) · 1 queued",
      percent: 73,
      indeterminate: false,
    });
  });

  it("shows which commit of a multi-commit job", () => {
    const status = describeScanStatus([
      job({
        status: "running",
        progress: {
          commit_hash: HASH,
          commit_index: 2,
          commit_count: 3,
          phase: "list-files",
          phase_label: "Listing files",
          phase_index: 1,
          phase_count: 5,
          done: 0,
          total: 0,
          fraction: 1 / 3,
        },
      }),
    ]);
    expect(status?.label).toBe(
      "Scanning commit 2/3 aaaaaaaaaa · Listing files (step 1/5)",
    );
  });
});
