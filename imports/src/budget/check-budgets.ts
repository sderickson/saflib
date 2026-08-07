import fs from "node:fs";
import path from "node:path";
import {
  buildPackageIndex,
  findMonorepoRoot,
} from "../resolve/index.ts";
import { measureGraph } from "../graph/walk-graph.ts";

/** Per-entry or test-file budget limits from `package.json` `importBudget`. */
export interface BudgetLimits {
  maxModules?: number;
  maxExternalPackages?: number;
}

/** `importBudget` schema in package.json. */
export interface ImportBudget {
  testFiles?: BudgetLimits;
  entries?: Record<string, BudgetLimits>;
}

export type BudgetMode = "warn" | "error";

export interface BudgetViolation {
  packageName: string;
  kind: "testFiles" | "entry";
  /** Relative entry path when `kind === "entry"`. */
  entry?: string;
  metric: "modules" | "ext";
  actual: number;
  max: number;
}

export interface CheckBudgetsOptions {
  /** Monorepo root; auto-detected from cwd when omitted. */
  root?: string;
  mode?: BudgetMode;
}

export interface CheckBudgetsResult {
  violations: BudgetViolation[];
  packagesChecked: number;
}

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "coverage",
  "fixtures",
]);

function listTestFiles(dir: string, out: string[] = []): string[] {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (e.name.startsWith(".")) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      listTestFiles(full, out);
    } else if (e.isFile() && e.name.endsWith(".test.ts")) {
      out.push(full);
    }
  }
  return out;
}

function readImportBudget(pkgDir: string): ImportBudget | null {
  try {
    const pj = JSON.parse(
      fs.readFileSync(path.join(pkgDir, "package.json"), "utf8"),
    ) as { importBudget?: ImportBudget };
    return pj.importBudget ?? null;
  } catch {
    return null;
  }
}

function checkLimits(
  packageName: string,
  kind: "testFiles" | "entry",
  limits: BudgetLimits,
  actual: { modules: number; ext: number },
  entry?: string,
): BudgetViolation[] {
  const violations: BudgetViolation[] = [];
  if (
    limits.maxModules !== undefined &&
    actual.modules > limits.maxModules
  ) {
    violations.push({
      packageName,
      kind,
      entry,
      metric: "modules",
      actual: actual.modules,
      max: limits.maxModules,
    });
  }
  if (
    limits.maxExternalPackages !== undefined &&
    actual.ext > limits.maxExternalPackages
  ) {
    violations.push({
      packageName,
      kind,
      entry,
      metric: "ext",
      actual: actual.ext,
      max: limits.maxExternalPackages,
    });
  }
  return violations;
}

/**
 * Scan workspace packages with `importBudget` and compare measured graphs
 * against declared limits. Packages without `importBudget` are skipped.
 */
export function checkBudgets(
  options: CheckBudgetsOptions = {},
): CheckBudgetsResult {
  const root = options.root ?? findMonorepoRoot(process.cwd());
  const index = buildPackageIndex(root);
  const violations: BudgetViolation[] = [];
  let packagesChecked = 0;

  for (const [packageName, pkg] of index) {
    const budget = readImportBudget(pkg.dir);
    if (!budget) continue;
    packagesChecked++;

    if (budget.testFiles) {
      const tests = listTestFiles(pkg.dir);
      let maxModules = 0;
      let maxExt = 0;
      for (const testFile of tests) {
        const result = measureGraph(testFile, { root });
        maxModules = Math.max(maxModules, result.modules);
        maxExt = Math.max(maxExt, result.ext);
      }
      violations.push(
        ...checkLimits(packageName, "testFiles", budget.testFiles, {
          modules: maxModules,
          ext: maxExt,
        }),
      );
    }

    if (budget.entries) {
      for (const [entryRel, limits] of Object.entries(budget.entries)) {
        const entryPath = path.resolve(pkg.dir, entryRel);
        if (!fs.existsSync(entryPath)) {
          violations.push({
            packageName,
            kind: "entry",
            entry: entryRel,
            metric: "modules",
            actual: -1,
            max: limits.maxModules ?? 0,
          });
          continue;
        }
        const result = measureGraph(entryPath, { root });
        violations.push(
          ...checkLimits(packageName, "entry", limits, result, entryRel),
        );
      }
    }
  }

  return { violations, packagesChecked };
}

/** Format a single violation for CLI output. */
export function formatViolation(v: BudgetViolation): string {
  if (v.kind === "testFiles") {
    return `${v.packageName} testFiles ${v.metric}=${v.actual} exceeds max ${v.max}`;
  }
  if (v.actual < 0) {
    return `${v.packageName} entry ${v.entry} not found`;
  }
  return `${v.packageName} entry ${v.entry} ${v.metric}=${v.actual} exceeds max ${v.max}`;
}
