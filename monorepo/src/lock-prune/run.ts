import { execFileSync } from "node:child_process";
import path from "node:path";
import { findMonorepoRoot } from "@saflib/imports";
import {
  isFixableIssue,
  type LockPruneIssue,
  type LockPruneOptions,
} from "./types.ts";
import { analyzeProductLockPrune } from "./analyze.ts";
import { applyLockPruneFixes } from "./apply.ts";
import { formatIssue } from "./format.ts";

const DEFAULT_MAX_PASSES = 5;

function npmReresolve(rootDir: string): void {
  execFileSync(
    "npm",
    [
      "install",
      "--package-lock-only",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
    ],
    { cwd: rootDir, stdio: "inherit" },
  );
}

/**
 * Inside an npm install (a product's `preinstall` hook runs `--yes`), npm
 * resolves the lockfile itself right after; calling npm again would recurse.
 */
function insideNpmInstall(): boolean {
  return ["install", "ci", "update"].includes(process.env.npm_command ?? "");
}

function printIssues(heading: string, issues: LockPruneIssue[]): void {
  if (issues.length === 0) return;
  console.log(heading);
  console.log("");
  for (const issue of issues) {
    for (const line of formatIssue(issue)) console.log(line);
    console.log("");
  }
}

/** Identity of a misaligned nesting, to notice npm putting it back. */
function misalignmentKey(issue: LockPruneIssue): string | undefined {
  return issue.kind === "workspace-misaligned"
    ? `${issue.lockfileKey}@${issue.nestedVersion}`
    : undefined;
}

/**
 * Reports product/saflib workspace issues; exits 1 if there are any.
 *
 * With `fix`, loops: apply the fixable issues' fixes (lockfile bookkeeping),
 * re-resolve with npm, re-analyze, until nothing fixable is left. A workspace
 * misalignment npm recreates after a clean re-resolve is a genuine range
 * conflict and is reported instead of retried. Exits 0 when the lockfile ends
 * up passing the workspace alignment check; issues that would mean overriding
 * the product's own dependency choices are only ever reported.
 */
export async function runLockPrune(
  options: LockPruneOptions = {},
): Promise<number> {
  const rootDir = path.resolve(
    options.rootDir ?? findMonorepoRoot(process.cwd()),
  );
  const nested = !options.reresolve && insideNpmInstall();
  const reresolve = options.reresolve ?? npmReresolve;
  const maxPasses = nested ? 1 : (options.maxPasses ?? DEFAULT_MAX_PASSES);

  let analysis = analyzeProductLockPrune(rootDir);
  if (analysis.issues.length === 0) {
    console.log("No product/saflib workspace issues found.");
    return 0;
  }
  console.log(`Checked ${analysis.rootDir}`);
  console.log("");

  if (!options.fix) {
    printIssues(
      "To review (not changed automatically):",
      analysis.issues.filter((issue) => !isFixableIssue(issue)),
    );
    printIssues("Fixable with --fix:", analysis.issues.filter(isFixableIssue));
    return 1;
  }

  const attempted = new Set<string>();
  let changed = false;
  for (let pass = 1; pass <= maxPasses; pass++) {
    const fixable = analysis.issues.filter((issue) => {
      if (!isFixableIssue(issue)) return false;
      const key = misalignmentKey(issue);
      return key === undefined || !attempted.has(key);
    });
    if (fixable.length === 0) break;

    printIssues(`Fixing (pass ${pass}):`, fixable);
    for (const line of applyLockPruneFixes({ ...analysis, issues: fixable })) {
      console.log(`fixed: ${line}`);
    }
    for (const issue of fixable) {
      const key = misalignmentKey(issue);
      if (key) attempted.add(key);
    }
    console.log("");
    changed = true;
    if (nested) break;
    console.log("Re-resolving package-lock.json...");
    reresolve(rootDir);
    console.log("");
    analysis = analyzeProductLockPrune(rootDir);
  }

  if (nested) {
    // npm re-resolves next; the dev stack / CI alignment check has the last word.
    return 0;
  }

  const conflicts = analysis.issues.filter(
    (issue) => issue.kind === "workspace-misaligned",
  );
  const unfixed = analysis.issues.filter(
    (issue) => isFixableIssue(issue) && issue.kind !== "workspace-misaligned",
  );
  const reportOnly = analysis.issues.filter((issue) => !isFixableIssue(issue));

  printIssues("To review (not changed automatically):", reportOnly);
  if (conflicts.length > 0) {
    printIssues(
      "Still misaligned after re-resolving (the version ranges genuinely conflict: align them, or add a root override that matches saflib's):",
      conflicts,
    );
  }
  if (unfixed.length > 0) {
    printIssues(`Still fixable after ${maxPasses} passes:`, unfixed);
  }

  if (changed) {
    console.log(
      "Run `npm install` from the product root to refresh node_modules.",
    );
  }
  if (analysis.issues.length === 0) {
    console.log("No product/saflib workspace issues left.");
  }
  return conflicts.length > 0 || unfixed.length > 0 ? 1 : 0;
}
