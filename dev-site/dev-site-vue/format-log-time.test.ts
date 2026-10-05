import { describe, it, expect } from "vitest";
import { formatLogTime } from "./format-log-time.ts";

describe("formatLogTime", () => {
  it("formats a valid ISO timestamp as a local wall-clock time", () => {
    const label = formatLogTime("2026-09-15T15:04:05.000Z");
    // Locale-dependent (12h vs 24h), but must include the minute/second.
    expect(label).toMatch(/04/);
    expect(label).toMatch(/05/);
  });

  it("returns empty string for invalid input", () => {
    expect(formatLogTime("not-a-date")).toBe("");
  });
});
