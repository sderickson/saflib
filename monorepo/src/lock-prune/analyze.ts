import { existsSync } from "node:fs";
import path from "node:path";
import { buildPackageIndex } from "@saflib/imports";
import type { LockPruneAnalysis, LockPruneIssue } from "./types.ts";
import { isEmbeddedProductMonorepo, readPlatformContract } from "./platform.ts";
import {
  findCompetingDependencies,
  findPlatformOverrideDrift,
} from "./package-deps.ts";
import {
  findHoistingHazards,
  findUnhoistedRegistryDependencies,
} from "./hoist.ts";
import { findLockfileVersionSkew } from "./align.ts";
import { findStaleLockfileEntries } from "./stale.ts";
import { readPackageLock } from "./lockfile-ops.ts";
import { findWorkspaceAlignmentIssues } from "./workspace-issues.ts";

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
    };
  }

  const platform = readPlatformContract(rootDir);
  const packageIndex = buildPackageIndex(rootDir);
  const lockfile = readPackageLock(lockfilePath);

  const issues: LockPruneIssue[] = [
    ...findCompetingDependencies(rootDir, packageIndex, platform),
    ...findHoistingHazards(rootDir),
    ...findUnhoistedRegistryDependencies(lockfile, platform),
    ...findLockfileVersionSkew(lockfile, platform),
  ];

  const workspaceIssues = findWorkspaceAlignmentIssues(lockfile, issues);
  // A nested copy is reported once, as the (fixable) workspace issue.
  const nestedKeys = new Set(workspaceIssues.map((issue) => issue.lockfileKey));
  const deduped = issues.filter(
    (issue) =>
      issue.kind !== "lockfile-version-skew" ||
      !nestedKeys.has(issue.productLockfileKey),
  );
  issues.length = 0;
  issues.push(...deduped, ...workspaceIssues);

  const overrideDrift = findPlatformOverrideDrift(rootDir, platform);
  if (overrideDrift) issues.push(overrideDrift);

  const staleLockfile = findStaleLockfileEntries(lockfile, rootDir);
  if (staleLockfile) issues.push(staleLockfile);

  return {
    rootDir,
    saflibDir,
    lockfilePath,
    issues,
  };
}
