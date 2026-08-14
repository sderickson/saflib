import type { IssueCountsByKind } from "./package-issues.ts";
import type { PackageSizeTier } from "./package-size.ts";
import { PACKAGE_SIZE_LABELS } from "./package-size.ts";

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

function lerpChannel(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

function mix(a: Rgb, b: Rgb, t: number): string {
  return `rgb(${lerpChannel(a[0], b[0], t)}, ${lerpChannel(a[1], b[1], t)}, ${lerpChannel(a[2], b[2], t)})`;
}

/**
 * Solid-circle color for every package: green (0) → yellow → red as debt rises.
 */
export function debtDotColor(
  debtCount: number,
  /** Debt count that maps to full red (log scale). */
  cap = 15,
): string {
  const t = Math.min(
    1,
    Math.log2(1 + Math.max(0, debtCount)) / Math.log2(1 + cap),
  );
  if (t <= 0.5) return mix(GREEN, YELLOW, t / 0.5);
  return mix(YELLOW, RED, (t - 0.5) / 0.5);
}

export function debtDotSizePx(tier: PackageSizeTier | undefined): number {
  return DEBT_DOT_SIZE_PX[tier ?? "S"];
}

export interface DebtTooltipInput {
  debtCount: number;
  issueCountsByKind: IssueCountsByKind;
  packageSize?: PackageSizeTier;
  sourceLines?: number;
  testLines?: number;
}

/** Short tooltip for package nav debt dots. */
export function debtTooltipText(input: DebtTooltipInput): string {
  const k = input.issueCountsByKind;
  const parts = [
    `Debt ${input.debtCount}`,
    `dead ${k["dead-code"]}`,
    `oversized ${k["oversized-file"]}`,
    `layout ${k["package-layout"]}`,
  ];
  if (input.packageSize) {
    parts.push(`size ${PACKAGE_SIZE_LABELS[input.packageSize]}`);
  }
  if (input.sourceLines != null && input.testLines != null) {
    parts.push(`${input.sourceLines}/${input.testLines} LOC`);
  }
  return parts.join(" · ");
}
