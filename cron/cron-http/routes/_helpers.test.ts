import { describe, expect, it } from "vitest";
import { computeRunsNextAt } from "./_helpers.ts";

describe("computeRunsNextAt", () => {
  it("returns null when disabled", () => {
    expect(computeRunsNextAt("*/15 * * * *", false)).toBeNull();
  });

  it("returns null when schedule is missing", () => {
    expect(computeRunsNextAt(undefined, true)).toBeNull();
  });

  it("returns an ISO timestamp for a valid enabled schedule", () => {
    const next = computeRunsNextAt("*/15 * * * *", true);
    expect(next).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(new Date(next!).getTime()).toBeGreaterThan(Date.now() - 60_000);
  });
});
