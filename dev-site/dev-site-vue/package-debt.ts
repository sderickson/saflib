import type { IssueCountsByKind } from "./package-issues.ts";
import type { PackageSizeTier } from "./package-size.ts";
import { PACKAGE_SIZE_LABELS } from "./package-size.ts";
import { formatLocPair } from "./format-loc.ts";

type Rgb = readonly [number, number, number];

const GREEN: Rgb = [67, 160, 71]; // #43A047
const YELLOW: Rgb = [249, 168, 37]; // #F9A825
const RED: Rgb = [198, 40, 40]; // #C62828

/** Dot diameter (px) by package size tier. */
export const DEBT_DOT_SIZE_PX: Record<PackageSizeTier, number> = {
  S: 6,
  M: 9,
  L: 12,
  XL: 16,
};

/**
 * Debt density (issues per 1000 LOC) that maps to full red.
 * Tuned so a few issues in a tiny package read hot; dozens in a large package
 * need higher absolute counts to look the same.
 */
export const DEBT_DENSITY_CAP_PER_KLOC = 8;

function lerpChannel(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

function mix(a: Rgb, b: Rgb, t: number): string {
  return `rgb(${lerpChannel(a[0], b[0], t)}, ${lerpChannel(a[1], b[1], t)}, ${lerpChannel(a[2], b[2], t)})`;
}

/** Issues per 1000 lines of analyzed source (floors LOC at 1). */
export function debtDensityPerKloc(debt_count: number, source_lines: number): number {
  const loc = Math.max(1, source_lines);
  return (Math.max(0, debt_count) / loc) * 1000;
}

/**
 * Solid-circle color from debt density (issues / kLOC): green → yellow → red.
 */
export function debtDotColor(
  debt_count: number,
  source_lines = 0,
  densityCapPerKloc = DEBT_DENSITY_CAP_PER_KLOC,
): string {
  if (debt_count <= 0) return mix(GREEN, GREEN, 0);
  const density = debtDensityPerKloc(debt_count, source_lines);
  const t = Math.min(1, density / Math.max(densityCapPerKloc, 1e-6));
  if (t <= 0.5) return mix(GREEN, YELLOW, t / 0.5);
  return mix(YELLOW, RED, (t - 0.5) / 0.5);
}

export function debtDotSizePx(tier: PackageSizeTier | undefined): number {
  return DEBT_DOT_SIZE_PX[tier ?? "S"];
}

export interface DebtTooltipInput {
  debt_count: number;
  issue_counts_by_kind: IssueCountsByKind;
  packageSize?: PackageSizeTier;
  source_lines?: number;
  test_lines?: number;
}

/** Short tooltip for package nav debt dots. */
export function debtTooltipText(input: DebtTooltipInput): string {
  const k = input.issue_counts_by_kind;
  const loc = input.source_lines ?? 0;
  const density = debtDensityPerKloc(input.debt_count, loc);
  const parts = [
    `Debt ${input.debt_count}`,
    `${density.toFixed(1)}/kLOC`,
    `dead ${k["dead-code"]}`,
    `oversized ${k["oversized-file"]}`,
    `layout ${k["package-layout"]}`,
  ];
  if (input.packageSize) {
    parts.push(`size ${PACKAGE_SIZE_LABELS[input.packageSize]}`);
  }
  if (input.source_lines != null && input.test_lines != null) {
    parts.push(`${formatLocPair(input.source_lines, input.test_lines)} LOC`);
  }
  return parts.join(" · ");
}
