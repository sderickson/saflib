import fs from "node:fs";
import type { BoundaryViolation } from "./check-boundaries.ts";

export interface BoundariesBaseline {
  /** Violation keys accepted as known debt. Only ever shrinks. */
  violations: string[];
}

export interface BaselineComparison {
  /** Violations not in the baseline. */
  added: BoundaryViolation[];
  /** Baseline keys that no longer occur (fixed; remove them). */
  stale: string[];
}

export function readBaseline(filePath: string): BoundariesBaseline {
  if (!fs.existsSync(filePath)) return { violations: [] };
  const parsed = JSON.parse(
    fs.readFileSync(filePath, "utf8"),
  ) as Partial<BoundariesBaseline>;
  return { violations: parsed.violations ?? [] };
}

export function writeBaseline(
  filePath: string,
  violations: BoundaryViolation[],
): void {
  const body: BoundariesBaseline = {
    violations: [...new Set(violations.map((v) => v.key))].sort(),
  };
  fs.writeFileSync(filePath, JSON.stringify(body, null, 2) + "\n");
}

export function compareToBaseline(
  violations: BoundaryViolation[],
  baseline: BoundariesBaseline,
): BaselineComparison {
  const known = new Set(baseline.violations);
  const current = new Set(violations.map((v) => v.key));
  return {
    added: violations.filter((v) => !known.has(v.key)),
    stale: baseline.violations.filter((k) => !current.has(k)).sort(),
  };
}
