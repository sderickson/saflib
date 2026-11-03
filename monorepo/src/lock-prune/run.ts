import path from "node:path";
import { findMonorepoRoot } from "@saflib/imports";
import { isFixableIssue, type LockPruneOptions } from "./types.ts";
import { analyzeProductLockPrune } from "./analyze.ts";
import { applyLockPruneFixes } from "./apply.ts";
import { formatIssue } from "./format.ts";

/**
 * Reports product/saflib workspace issues. With `fix`, repairs the fixable
 * ones (lockfile bookkeeping) and exits 0; without it, exits 1 if there are
 * any issues. Issues that would mean overriding the product's own dependency
 * choices are only ever reported.
 */
export async function runLockPrune(
  options: LockPruneOptions = {},
): Promise<number> {
  const rootDir = path.resolve(
    options.rootDir ?? findMonorepoRoot(process.cwd()),
  );
  const analysis = analyzeProductLockPrune(rootDir);

  if (analysis.issues.length === 0) {
    console.log("No product/saflib workspace issues found.");
    return 0;
  }

  console.log(`Checked ${analysis.rootDir}`);
  console.log("");

  const fixable = analysis.issues.filter(isFixableIssue);
  const reportOnly = analysis.issues.filter((issue) => !isFixableIssue(issue));

  if (reportOnly.length > 0) {
    console.log("To review (not changed automatically):");
    console.log("");
    for (const issue of reportOnly) {
      for (const line of formatIssue(issue)) console.log(line);
      console.log("");
    }
  }

  if (fixable.length > 0) {
    console.log(options.fix ? "Fixing:" : "Fixable with --fix:");
    console.log("");
    for (const issue of fixable) {
      for (const line of formatIssue(issue)) console.log(line);
      console.log("");
    }
  }

  if (!options.fix) {
    return 1;
  }

  const applied = applyLockPruneFixes({ ...analysis, issues: fixable });
  for (const line of applied) {
    console.log(`fixed: ${line}`);
  }
  if (applied.length > 0) {
    console.log("");
    console.log(
      "Run `npm install` from the product root to refresh node_modules.",
    );
  }
  return 0;
}
