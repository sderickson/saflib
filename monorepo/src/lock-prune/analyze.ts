import { existsSync } from "node:fs";
import path from "node:path";
import { buildPackageIndex } from "@saflib/imports";
import type { LockPruneAnalysis, LockPruneIssue } from "./types.ts";
import { isEmbeddedProductMonorepo, readPlatformContract } from "./platform.ts";
import {
  findCompetingDependencies,
  findPlatformOverrideDrift,
  findRedundantDependencies,
} from "./package-deps.ts";
import { findHoistingHazards, findUnhoistedRegistryDependencies } from "./hoist.ts";
import {
  findLockfileVersionSkew,
  findPlatformAlignmentGaps,
} from "./align.ts";
import { findStaleLockfileEntries } from "./stale.ts";
import { readPackageLock } from "./lockfile-ops.ts";

export function analyzeProductLockPrune(rootDir: string): LockPruneAnalysis {
  const saflibDir = path.join(rootDir, "saflib");
  if (!isEmbeddedProductMonorepo(rootDir)) {
    throw new Error(
      "saf-monorepo lock-prune requires a product repo with an embedded saflib/ workspace. Run from the product root.",
    );
  }

  const lockfilePath = path.join(rootDir, "package-lock.json");
  if (!existsSync(lockfilePath)) {
    return {
      rootDir,
      saflibDir,
      lockfilePath,
      issues: [],
      warnings: [],
    };
  }

  const platform = readPlatformContract(rootDir);
  const packageIndex = buildPackageIndex(rootDir);
  const lockfile = readPackageLock(lockfilePath);

  const redundant = findRedundantDependencies(rootDir, packageIndex);
  const fixableRedundant = findRedundantDependencies(rootDir, packageIndex, {
    fixableOnly: true,
  });
  const warnings = redundant.filter(
    (issue) =>
      !fixableRedundant.some(
        (fixable) =>
          fixable.packageJsonPath === issue.packageJsonPath &&
          fixable.dependency === issue.dependency &&
          fixable.field === issue.field,
      ),
  );

  const alignmentGaps = findPlatformAlignmentGaps(lockfile, platform);
  const nestedSkew = findLockfileVersionSkew(lockfile, platform);
  // Deduplicate: prefer the canonical align-key issue from gaps.
  const gapKeys = new Set(
    alignmentGaps.map(
      (issue) => `${issue.dependency}:${issue.productAlignKey}`,
    ),
  );
  const uniqueNestedSkew = nestedSkew.filter(
    (issue) => !gapKeys.has(`${issue.dependency}:${issue.productAlignKey}`),
  );

  const issues: LockPruneIssue[] = [
    ...fixableRedundant,
    ...findCompetingDependencies(rootDir, packageIndex, platform),
    ...findHoistingHazards(rootDir),
    ...findUnhoistedRegistryDependencies(lockfile, platform),
    ...alignmentGaps,
    ...uniqueNestedSkew,
  ];

  const overrideDrift = findPlatformOverrideDrift(rootDir, platform);
  if (overrideDrift) issues.push(overrideDrift);

  const staleLockfile = findStaleLockfileEntries(lockfile, rootDir);
  if (staleLockfile) issues.push(staleLockfile);

  return {
    rootDir,
    saflibDir,
    lockfilePath,
    issues,
    warnings,
  };
}
