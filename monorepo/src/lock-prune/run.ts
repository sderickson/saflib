import { createInterface } from "node:readline/promises";
import path from "node:path";
import { stdin as input, stdout as output } from "node:process";
import { findMonorepoRoot } from "@saflib/imports";
import type { LockPruneOptions } from "./types.ts";
import { analyzeProductLockPrune } from "./analyze.ts";
import { applyLockPruneFixes } from "./apply.ts";
import { formatIssue } from "./format.ts";

async function defaultConfirm(message: string): Promise<boolean> {
  const rl = createInterface({ input, output });
  const answer = await rl.question(`${message} [y/N] `);
  rl.close();
  return /^y(es)?$/i.test(answer.trim());
}

export async function runLockPrune(
  options: LockPruneOptions = {},
): Promise<number> {
  const rootDir = path.resolve(
    options.rootDir ?? findMonorepoRoot(process.cwd()),
  );
  const analysis = analyzeProductLockPrune(rootDir);

  if (analysis.issues.length === 0 && analysis.warnings.length === 0) {
    console.log("No product/saflib workspace issues found.");
    return 0;
  }

  console.log(`Checked ${analysis.rootDir}`);
  console.log("");

  if (analysis.warnings.length > 0) {
    console.log("Warnings (not auto-fixed for deploy packages):");
    for (const warning of analysis.warnings) {
      console.log(
        `  ${warning.dependency}@${warning.spec} in ${warning.packageJsonPath} is redundant (saflib already owns it).`,
      );
    }
    console.log("");
  }

  if (analysis.issues.length === 0) {
    return 0;
  }

  for (const issue of analysis.issues) {
    for (const line of formatIssue(issue)) {
      console.log(line);
    }
    console.log("");
  }

  if (options.check) {
    console.log("Check mode: no changes made.");
    return 1;
  }

  const confirm = options.confirm ?? defaultConfirm;
  const shouldFix =
    options.yes === true ||
    (await confirm("Apply fixes for the issues above?"));

  if (!shouldFix) {
    console.log("No changes made.");
    return 1;
  }

  const applied = applyLockPruneFixes(analysis);
  for (const line of applied) {
    console.log(`fixed: ${line}`);
  }
  console.log("");
  console.log("Run `npm install` from the product root to refresh node_modules.");
  return 0;
}
