import { describe, expect, it } from "vitest";
import {
  classifyPackageSize,
  PACKAGE_SIZE_LOC_BOUNDS,
} from "./package-size.ts";

describe("classifyPackageSize", () => {
  it("maps LOC bands", () => {
    expect(classifyPackageSize({ source_lines: 500 })).toBe("S");
    expect(classifyPackageSize({ source_lines: 3_000 })).toBe("M");
    expect(classifyPackageSize({ source_lines: 12_000 })).toBe("L");
    expect(classifyPackageSize({ source_lines: 50_000 })).toBe("XL");
  });

  it("uses bound edges", () => {
    expect(
      classifyPackageSize({ source_lines: PACKAGE_SIZE_LOC_BOUNDS.S - 1 }),
    ).toBe("S");
    expect(classifyPackageSize({ source_lines: PACKAGE_SIZE_LOC_BOUNDS.S })).toBe(
      "M",
    );
    expect(classifyPackageSize({ source_lines: PACKAGE_SIZE_LOC_BOUNDS.L })).toBe(
      "XL",
    );
  });

  it("nudges up when many test files near a ceiling", () => {
    expect(
      classifyPackageSize({
        source_lines: Math.floor(PACKAGE_SIZE_LOC_BOUNDS.M * 0.8),
        test_files: 45,
      }),
    ).toBe("L");
  });
});
