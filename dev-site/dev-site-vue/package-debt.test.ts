import { describe, expect, it } from "vitest";
import {
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

describe("debtDotColor", () => {
  it("is green at zero debt", () => {
    expect(debtDotColor(0)).toBe("rgb(67, 160, 71)");
  });

  it("moves green → yellow → red as debt rises", () => {
    const zero = parseRgb(debtDotColor(0));
    const mid = parseRgb(debtDotColor(3));
    const high = parseRgb(debtDotColor(20));
    expect(mid[0]).toBeGreaterThan(zero[0]);
    expect(high[1]).toBeLessThan(mid[1]);
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
  it("summarizes debt kinds, size, and LOC", () => {
    const counts = emptyIssueCountsByKind();
    counts["dead-code"] = 2;
    counts["oversized-file"] = 1;
    expect(
      debtTooltipText({
        debtCount: 3,
        issueCountsByKind: counts,
        packageSize: "M",
        sourceLines: 100,
        testLines: 40,
      }),
    ).toBe(
      "Debt 3 · dead 2 · oversized 1 · layout 0 · size medium · 100/40 LOC",
    );
  });
});
