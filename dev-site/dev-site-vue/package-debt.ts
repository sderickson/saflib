import type { IssueCountsByKind } from "./package-issues.ts";

/**
 * Solid-circle color for packages with debt: yellow → red as count rises.
 * Returns null when there is no debt (no indicator).
 */
export function debtDotColor(
  debtCount: number,
  /** Debt count that maps to full red (log scale). */
  cap = 15,
): string | null {
  if (debtCount <= 0) return null;
  const t = Math.min(1, Math.log2(1 + debtCount) / Math.log2(1 + cap));
  // #F9A825 (amber/yellow) → #C62828 (red)
  const r = Math.round(249 + (198 - 249) * t);
  const g = Math.round(168 + (40 - 168) * t);
  const b = Math.round(37 + (40 - 37) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

export interface DebtTooltipInput {
  debtCount: number;
  issueCountsByKind: IssueCountsByKind;
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
  if (input.sourceLines != null && input.testLines != null) {
    parts.push(`${input.sourceLines}/${input.testLines} LOC`);
  }
  return parts.join(" · ");
}
