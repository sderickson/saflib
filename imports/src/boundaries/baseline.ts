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

const CYCLE_PREFIX = "cycle: ";

function cycleMembers(key: string): Set<string> {
  return new Set(key.slice(CYCLE_PREFIX.length).split(", "));
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
  // A cycle that shrank is progress, not a new violation: accept a cycle whose
  // packages are a subset of a baselined cycle (the old key then goes stale).
  const knownCycles = baseline.violations
    .filter((k) => k.startsWith(CYCLE_PREFIX))
    .map(cycleMembers);
  const isKnown = (v: BoundaryViolation) =>
    known.has(v.key) ||
    (v.kind === "cycle" &&
      knownCycles.some((members) =>
        [...cycleMembers(v.key)].every((m) => members.has(m)),
      ));
  return {
    added: violations.filter((v) => !isKnown(v)),
    stale: baseline.violations.filter((k) => !current.has(k)).sort(),
  };
}
