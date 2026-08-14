import { describe, expect, it } from "vitest";
import { debtDotColor, debtTooltipText } from "./package-debt.ts";
import { emptyIssueCountsByKind } from "./package-issues.ts";

describe("debtDotColor", () => {
  it("returns null for zero debt", () => {
    expect(debtDotColor(0)).toBeNull();
  });

  it("moves from yellow toward red as debt rises", () => {
    const low = debtDotColor(1)!;
    const high = debtDotColor(20)!;
    const parse = (rgb: string) => {
      const m = rgb.match(/rgb\((\d+), (\d+), (\d+)\)/);
      return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : [0, 0, 0];
    };
    const [, gLow] = parse(low);
    const [, gHigh] = parse(high);
    expect(gLow).toBeGreaterThan(gHigh);
  });
});

describe("debtTooltipText", () => {
  it("summarizes debt kinds and LOC", () => {
    const counts = emptyIssueCountsByKind();
    counts["dead-code"] = 2;
    counts["oversized-file"] = 1;
    expect(
      debtTooltipText({
        debtCount: 3,
        issueCountsByKind: counts,
        sourceLines: 100,
        testLines: 40,
      }),
    ).toBe("Debt 3 · dead 2 · oversized 1 · layout 0 · 100/40 LOC");
  });
});
