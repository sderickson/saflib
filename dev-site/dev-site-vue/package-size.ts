/**
 * Rough package size tiers for split/review guidance.
 * Primary signal: total analyzed LOC (prod + test). Thresholds are heuristics
 * tuned on this monorepo — adjust as the product grows.
 */
export type PackageSizeTier = "S" | "M" | "L" | "XL";

export const PACKAGE_SIZE_LABELS: Record<PackageSizeTier, string> = {
  S: "small",
  M: "medium",
  L: "large",
  XL: "too large",
};

/** Inclusive upper bounds for S / M / L; anything above is XL. */
export const PACKAGE_SIZE_LOC_BOUNDS = {
  /** < this → S (focused lib / thin service slice). */
  S: 2_000,
  /** < this → M (typical saflib package). */
  M: 8_000,
  /** < this → L (big but still one concern); ≥ → XL (split candidate). */
  L: 25_000,
} as const;

export interface PackageSizeInput {
  /** Total analyzed lines (prod + test), as stored on package metrics. */
  source_lines: number;
  test_files?: number;
}

/**
 * Classify package size. LOC is the main signal; very high test-file counts
 * can nudge M→L or L→XL when near a boundary (many concerns / surfaces).
 */
export function classifyPackageSize(input: PackageSizeInput): PackageSizeTier {
  const loc = Math.max(0, input.source_lines);
  const tests = Math.max(0, input.test_files ?? 0);

  let tier: PackageSizeTier;
  if (loc < PACKAGE_SIZE_LOC_BOUNDS.S) tier = "S";
  else if (loc < PACKAGE_SIZE_LOC_BOUNDS.M) tier = "M";
  else if (loc < PACKAGE_SIZE_LOC_BOUNDS.L) tier = "L";
  else tier = "XL";

  // Near the top of a band with many test files → nudge up one tier.
  if (tier === "S" && tests >= 25 && loc >= PACKAGE_SIZE_LOC_BOUNDS.S * 0.75) {
    tier = "M";
  } else if (
    tier === "M" &&
    tests >= 40 &&
    loc >= PACKAGE_SIZE_LOC_BOUNDS.M * 0.75
  ) {
    tier = "L";
  } else if (
    tier === "L" &&
    tests >= 80 &&
    loc >= PACKAGE_SIZE_LOC_BOUNDS.L * 0.75
  ) {
    tier = "XL";
  }

  return tier;
}

/** Vuetify color name for sidebar chips. */
export function packageSizeColor(tier: PackageSizeTier): string {
  switch (tier) {
    case "S":
      return "success";
    case "M":
      return "info";
    case "L":
      return "warning";
    case "XL":
      return "error";
  }
}
