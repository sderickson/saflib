import { describe, expect, it } from "vitest";
import {
  debtDensityPerKloc,
  debtDotColor,
  debtDotSizePx,
  debtTooltipText,
  DEBT_DOT_SIZE_PX,
} from "./package-debt.ts";
import { emptyIssueCountsByKind } from "./package-issues.ts";

function parseRgb(rgb: string): [number, number, number] {
  const m = rgb.match(/rgb\((\d+), (\d+), (\d+)\)/);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : [0, 0, 0];
}

describe("debtDensityPerKloc", () => {
  it("scales with debt and LOC", () => {
    expect(debtDensityPerKloc(0, 1000)).toBe(0);
    expect(debtDensityPerKloc(8, 1000)).toBe(8);
    expect(debtDensityPerKloc(4, 500)).toBe(8);
  });
});

describe("debtDotColor", () => {
  it("is green at zero debt", () => {
    expect(debtDotColor(0, 1000)).toBe("rgb(67, 160, 71)");
  });

  it("is hotter for the same debt in a smaller package", () => {
    const small = parseRgb(debtDotColor(4, 400));
    const large = parseRgb(debtDotColor(4, 8000));
    // Higher density → more red / less green
    expect(small[1]).toBeLessThan(large[1]);
  });

  it("moves toward red as density rises", () => {
    const low = parseRgb(debtDotColor(1, 5000));
    const high = parseRgb(debtDotColor(40, 1000));
    expect(high[1]).toBeLessThan(low[1]);
    expect(high[0]).toBeGreaterThan(150);
  });
});

describe("debtDotSizePx", () => {
  it("grows with package size tier", () => {
    expect(debtDotSizePx("S")).toBe(DEBT_DOT_SIZE_PX.S);
    expect(debtDotSizePx("M")).toBeGreaterThan(debtDotSizePx("S"));
    expect(debtDotSizePx("L")).toBeGreaterThan(debtDotSizePx("M"));
    expect(debtDotSizePx("XL")).toBeGreaterThan(debtDotSizePx("L"));
  });
});

describe("debtTooltipText", () => {
  it("summarizes density, debt kinds, size, and LOC", () => {
    const counts = emptyIssueCountsByKind();
    counts["dead-code"] = 2;
    counts["oversized-file"] = 1;
    expect(
      debtTooltipText({
        debtCount: 3,
        issueCountsByKind: counts,
        packageSize: "M",
        sourceLines: 1000,
        testLines: 40,
      }),
    ).toBe(
      "Debt 3 · 3.0/kLOC · dead 2 · oversized 1 · layout 0 · size medium · 1000/40 LOC",
    );
  });
});
