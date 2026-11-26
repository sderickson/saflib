import { describe, expect, it } from "vitest";
import { formatShortDateTime } from "./date-format.ts";

describe("formatShortDateTime", () => {
  it("formats compactly without the comma", () => {
    const s = formatShortDateTime("2026-11-26T16:30:00Z");
    expect(s).not.toContain(",");
    expect(s).toMatch(/26/);
    expect(s).toMatch(/\d{1,2}:\d{2}/);
  });

  it("says — for missing or bad values", () => {
    expect(formatShortDateTime(null)).toBe("—");
    expect(formatShortDateTime("")).toBe("—");
    expect(formatShortDateTime("not a date")).toBe("—");
  });
});
