import { describe, expect, it } from "vitest";
import {
  isInternalReference,
  mergePackageReferences,
} from "./tsconfig-io.ts";

describe("mergePackageReferences", () => {
  it("ignores existing refs with missing path (empty {} after stub drop)", () => {
    const merged = mergePackageReferences(
      "/pkg",
      [
        { path: "./tsconfig.app.json" },
        // malformed leftover from product/init lineReplace
        { path: undefined as unknown as string },
        {} as { path: string },
      ],
      [{ path: "../other" }],
    );
    expect(merged).toEqual([
      { path: "../other" },
      { path: "./tsconfig.app.json" },
    ]);
  });
});

describe("isInternalReference", () => {
  it("returns false for undefined or empty path", () => {
    expect(isInternalReference("/pkg", undefined)).toBe(false);
    expect(isInternalReference("/pkg", "")).toBe(false);
  });
});
