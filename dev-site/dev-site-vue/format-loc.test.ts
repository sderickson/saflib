import { describe, expect, it } from "vitest";
import { formatLoc, formatLocChangePair, formatLocPair, formatLocSigned } from "./format-loc.ts";

describe("formatLoc", () => {
  it("keeps values under 1000 exact", () => {
    expect(formatLoc(0)).toBe("0");
    expect(formatLoc(1)).toBe("1");
    expect(formatLoc(999)).toBe("999");
  });

  it("rounds 1000+ to thousands with a k suffix", () => {
    expect(formatLoc(1000)).toBe("1k");
    expect(formatLoc(1499)).toBe("1k");
    expect(formatLoc(1500)).toBe("2k");
    expect(formatLoc(32_000)).toBe("32k");
    expect(formatLoc(32_400)).toBe("32k");
  });
});

describe("formatLocPair", () => {
  it("formats source/test independently", () => {
    expect(formatLocPair(432, 80)).toBe("432/80");
    expect(formatLocPair(32_000, 4_200)).toBe("32k/4k");
    expect(formatLocPair(12_000, 400)).toBe("12k/400");
  });
});

describe("formatLocChangePair", () => {
  it("signs source and test deltas independently", () => {
    expect(formatLocSigned(12)).toBe("+12");
    expect(formatLocSigned(-4)).toBe("−4");
    expect(formatLocSigned(0)).toBe("0");
    expect(formatLocChangePair(10, 5)).toBe("+10/+5");
    expect(formatLocChangePair(-8, 0)).toBe("−8/0");
  });
});
