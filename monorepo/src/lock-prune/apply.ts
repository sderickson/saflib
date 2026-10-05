import { writeFileSync } from "node:fs";
import type {
  HoistingHazardIssue,
  LockfileVersionSkewIssue,
  LockPruneAnalysis,
  PackageLock,
  UnhoistedRegistryDependencyIssue,
} from "./types.ts";
import { readPlatformContract } from "./platform.ts";
import {
  removeDeclaredDependency,
  syncPlatformOverrides,
} from "./package-deps.ts";
import {
  hoistMisplacedLockfilePeers,
  hoistUnhoistedRegistryDependencies,
} from "./hoist.ts";
import { alignSkewedLockfileEntries } from "./align.ts";
import { pruneStaleLockfileEntries } from "./stale.ts";
import { readPackageLock } from "./lockfile-ops.ts";

function writePrunedLockfile(
  lockfilePath: string,
  mutate: (lockfile: PackageLock) => void,
): void {
  const lockfile = readPackageLock(lockfilePath);
  mutate(lockfile);
  writeFileSync(lockfilePath, `${JSON.stringify(lockfile, null, 2)}\n`);
}

export function applyLockPruneFixes(analysis: LockPruneAnalysis): string[] {
  const applied: string[] = [];
  const hoistingHazards: HoistingHazardIssue[] = [];
  const unhoistedRegistry: UnhoistedRegistryDependencyIssue[] = [];
  const versionSkew: LockfileVersionSkewIssue[] = [];
  let wroteLockfile = false;
  const platform = readPlatformContract(analysis.rootDir);

  for (const issue of analysis.issues) {
    switch (issue.kind) {
      case "redundant-dependency":
        removeDeclaredDependency(
          issue.packageJsonPath,
          issue.field,
          issue.dependency,
        );
        applied.push(
          `removed redundant ${issue.dependency} from ${issue.packageJsonPath}`,
        );
        break;
      case "competing-dependency":
        removeDeclaredDependency(
          issue.packageJsonPath,
          issue.field,
          issue.dependency,
        );
        applied.push(
          `removed competing ${issue.dependency} from ${issue.packageJsonPath}`,
        );
        break;
      case "hoisting-hazard":
        hoistingHazards.push(issue);
        break;
      case "unhoisted-registry-dependency":
        unhoistedRegistry.push(issue);
        break;
      case "lockfile-version-skew":
        versionSkew.push(issue);
        break;
      case "platform-override-sync":
        for (const pin of syncPlatformOverrides(analysis.rootDir, platform)) {
          applied.push(`synced platform override ${pin}`);
        }
        break;
      case "stale-lockfile":
        writePrunedLockfile(issue.lockfilePath, (lockfile) => {
          pruneStaleLockfileEntries(lockfile, analysis.rootDir);
        });
        wroteLockfile = true;
        applied.push(
          `pruned ${issue.removedCount} stale lockfile entries in ${issue.lockfilePath}`,
        );
        break;
    }
  }

  if (
    hoistingHazards.length > 0 ||
    unhoistedRegistry.length > 0 ||
    versionSkew.length > 0
  ) {
    writePrunedLockfile(analysis.lockfilePath, (lockfile) => {
      if (hoistingHazards.length > 0) {
        for (const peer of hoistMisplacedLockfilePeers(
          lockfile,
          hoistingHazards,
        )) {
          applied.push(
            `hoisted ${peer} to the product root in package-lock.json`,
          );
        }
      }
      if (unhoistedRegistry.length > 0) {
        for (const dep of hoistUnhoistedRegistryDependencies(
          lockfile,
          unhoistedRegistry,
        )) {
          applied.push(
            `hoisted registry dependency ${dep} to the product root in package-lock.json`,
          );
        }
      }
      if (versionSkew.length > 0) {
        for (const dep of alignSkewedLockfileEntries(
          lockfile,
          versionSkew,
          platform,
        )) {
          applied.push(`aligned ${dep} to saflib lock version`);
        }
      }
    });
    wroteLockfile = true;
  }

  if (wroteLockfile) {
    applied.push(`updated ${analysis.lockfilePath}`);
  }

  return applied;
}
