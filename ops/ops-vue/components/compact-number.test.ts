import { describe, expect, it } from "vitest";
import { compactNumber } from "./compact-number.ts";

describe("compactNumber", () => {
  it("shortens thousands, millions and billions", () => {
    expect(compactNumber(999)).toBe("999");
    expect(compactNumber(2712)).toBe("2.7K");
    expect(compactNumber(3_400_000)).toBe("3.4M");
    expect(compactNumber(1_100_000_000)).toBe("1.1B");
  });
});
