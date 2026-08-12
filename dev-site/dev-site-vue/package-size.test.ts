import { describe, expect, it } from "vitest";
import {
  classifyPackageSize,
  PACKAGE_SIZE_LOC_BOUNDS,
} from "./package-size.ts";

describe("classifyPackageSize", () => {
  it("maps LOC bands", () => {
    expect(classifyPackageSize({ sourceLines: 500 })).toBe("S");
    expect(classifyPackageSize({ sourceLines: 3_000 })).toBe("M");
    expect(classifyPackageSize({ sourceLines: 12_000 })).toBe("L");
    expect(classifyPackageSize({ sourceLines: 50_000 })).toBe("XL");
  });

  it("uses bound edges", () => {
    expect(
      classifyPackageSize({ sourceLines: PACKAGE_SIZE_LOC_BOUNDS.S - 1 }),
    ).toBe("S");
    expect(classifyPackageSize({ sourceLines: PACKAGE_SIZE_LOC_BOUNDS.S })).toBe(
      "M",
    );
    expect(classifyPackageSize({ sourceLines: PACKAGE_SIZE_LOC_BOUNDS.L })).toBe(
      "XL",
    );
  });

  it("nudges up when many test files near a ceiling", () => {
    expect(
      classifyPackageSize({
        sourceLines: Math.floor(PACKAGE_SIZE_LOC_BOUNDS.M * 0.8),
        testFiles: 45,
      }),
    ).toBe("L");
  });
});
