import { describe, it, expect } from "vitest";
import { formatClockSummary, formatDuration, summarizeRunTimings } from "./plan-run-stats.ts";

describe("plan run stats", () => {
  const start = "2026-09-15T18:00:00.000Z";
  const end = "2026-09-15T19:30:00.000Z";

  it("uses created_at through updated_at for a finished run", () => {
    const summary = summarizeRunTimings(
      [{ created_at: start, updated_at: end, status: "done" }],
      new Date("2026-09-16T00:00:00.000Z"),
    );
    expect(summary?.durationMs).toBe(90 * 60 * 1000);
    expect(summary?.end?.toISOString()).toBe(end);
    expect(formatClockSummary(summary!)).toContain("1h 30m");
    expect(formatClockSummary(summary!)).toContain("–");
  });

  it("omits an end time while the run is still going, and counts up to now", () => {
    const now = new Date("2026-09-15T18:00:45.000Z");
    const summary = summarizeRunTimings(
      [{ created_at: start, updated_at: start, status: "running" }],
      now,
    );
    expect(summary?.end).toBeUndefined();
    expect(summary?.durationMs).toBe(45_000);
    expect(formatDuration(45_000)).toBe("45s");
    expect(formatClockSummary(summary!)).not.toContain("–");
  });

  it("spans a plan from the earliest start to the latest stop", () => {
    const summary = summarizeRunTimings(
      [
        { created_at: start, updated_at: "2026-09-15T18:20:00.000Z", status: "done" },
        { created_at: "2026-09-15T18:20:00.000Z", updated_at: end, status: "failed" },
      ],
      new Date(end),
    );
    expect(summary?.start.toISOString()).toBe(start);
    expect(summary?.end?.toISOString()).toBe(end);
    expect(formatDuration(summary!.durationMs)).toBe("1h 30m");
  });
});
