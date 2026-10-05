import { existsSync } from "node:fs";
import path from "node:path";
import type { PackageLock, StaleLockfileIssue } from "./types.ts";
import { isWorkspaceLockEntry } from "./paths.ts";

/** Detect stale workspace paths in the lockfile without mutating. */
export function findStaleLockfileEntries(
  lockfile: PackageLock,
  rootDir: string,
): StaleLockfileIssue | null {
  const packages = lockfile.packages ?? {};
  const stalePaths = Object.keys(packages).filter((key) => {
    if (key.startsWith("../")) return true;
    if (!isWorkspaceLockEntry(key)) return false;
    return !existsSync(path.join(rootDir, key, "package.json"));
  });
  if (stalePaths.length === 0) return null;

  const keysToDelete = collectStaleKeys(packages, stalePaths);

  return {
    kind: "stale-lockfile",
    lockfilePath: path.join(rootDir, "package-lock.json"),
    stalePaths: [...stalePaths].sort(),
    removedCount: keysToDelete.size,
  };
}

/** Apply stale-path deletion to a lockfile (mutates). */
export function pruneStaleLockfileEntries(
  lockfile: PackageLock,
  rootDir: string,
): StaleLockfileIssue | null {
  const issue = findStaleLockfileEntries(lockfile, rootDir);
  if (!issue) return null;

  const packages = lockfile.packages ?? {};
  const keysToDelete = collectStaleKeys(packages, issue.stalePaths);
  for (const key of keysToDelete) {
    delete packages[key];
  }
  return issue;
}

function collectStaleKeys(
  packages: NonNullable<PackageLock["packages"]>,
  stalePaths: string[],
): Set<string> {
  const keysToDelete = new Set<string>();
  for (const stalePath of stalePaths) {
    keysToDelete.add(stalePath);
    for (const key of Object.keys(packages)) {
      if (key === stalePath || key.startsWith(`${stalePath}/`)) {
        keysToDelete.add(key);
      }
    }
  }

  for (const [key, entry] of Object.entries(packages)) {
    if (!entry?.link || !entry.resolved) continue;
    if (keysToDelete.has(entry.resolved)) {
      keysToDelete.add(key);
    }
  }

  return keysToDelete;
}
