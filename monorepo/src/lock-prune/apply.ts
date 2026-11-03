import { writeFileSync } from "node:fs";
import type {
  HoistingHazardIssue,
  LockPruneAnalysis,
  PackageLock,
  UnhoistedRegistryDependencyIssue,
} from "./types.ts";
import {
  hoistMisplacedLockfilePeers,
  hoistUnhoistedRegistryDependencies,
} from "./hoist.ts";
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

/**
 * Applies the fixable issues' fixes (see `isFixableIssue`) to the product
 * lockfile. Other issues are left for a person to resolve.
 */
export function applyLockPruneFixes(analysis: LockPruneAnalysis): string[] {
  const applied: string[] = [];
  const hoistingHazards: HoistingHazardIssue[] = [];
  const unhoistedRegistry: UnhoistedRegistryDependencyIssue[] = [];
  let wroteLockfile = false;

  for (const issue of analysis.issues) {
    switch (issue.kind) {
      case "hoisting-hazard":
        hoistingHazards.push(issue);
        break;
      case "unhoisted-registry-dependency":
        unhoistedRegistry.push(issue);
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

  if (hoistingHazards.length > 0 || unhoistedRegistry.length > 0) {
    writePrunedLockfile(analysis.lockfilePath, (lockfile) => {
      for (const peer of hoistMisplacedLockfilePeers(
        lockfile,
        hoistingHazards,
      )) {
        applied.push(
          `hoisted ${peer} to the product root in package-lock.json`,
        );
      }
      for (const dep of hoistUnhoistedRegistryDependencies(
        lockfile,
        unhoistedRegistry,
      )) {
        applied.push(
          `hoisted registry dependency ${dep} to the product root in package-lock.json`,
        );
      }
    });
    wroteLockfile = true;
  }

  if (wroteLockfile) {
    applied.push(`updated ${analysis.lockfilePath}`);
  }

  return applied;
}
