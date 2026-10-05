import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type {
  HoistingHazardIssue,
  PackageLock,
  PlatformContract,
  UnhoistedRegistryDependencyIssue,
} from "./types.ts";
import { lockfileKeyForPackage, parseNestedSaflibRegistryLockKey } from "./paths.ts";
import {
  listInstalledPackageNames,
  listPackageDirectories,
} from "./package-deps.ts";
import type { PackageJsonDeps } from "./types.ts";

export function findHoistingHazards(rootDir: string): HoistingHazardIssue[] {
  const rootNodeModules = path.join(rootDir, "node_modules");
  const saflibNodeModules = path.join(rootDir, "saflib", "node_modules");
  if (!existsSync(rootNodeModules) || !existsSync(saflibNodeModules)) {
    return [];
  }

  const rootPackages = listInstalledPackageNames(rootNodeModules);
  const saflibPackages = listInstalledPackageNames(saflibNodeModules);
  const hazards: HoistingHazardIssue[] = [];

  for (const packageDir of listPackageDirectories(rootNodeModules)) {
    const pkg = JSON.parse(
      readFileSync(path.join(packageDir, "package.json"), "utf8"),
    ) as PackageJsonDeps;
    const peerDependencies = pkg.peerDependencies ?? {};
    const requiredBy = pkg.name ?? path.basename(packageDir);

    for (const peer of Object.keys(peerDependencies)) {
      if (rootPackages.has(peer)) continue;
      if (!saflibPackages.has(peer)) continue;
      hazards.push({
        kind: "hoisting-hazard",
        peer,
        requiredBy,
        saflibLockfileKey: lockfileKeyForPackage("saflib/node_modules", peer),
        rootLockfileKey: lockfileKeyForPackage("node_modules", peer),
      });
    }
  }

  return hazards.sort(
    (a, b) =>
      a.peer.localeCompare(b.peer) || a.requiredBy.localeCompare(b.requiredBy),
  );
}

/**
 * Nested saflib registry installs missing from the product root — except
 * intentional dual-installs (platform has the same relative nest *and* a
 * different version at the platform root). Nested-only platform installs
 * are not dual-installs and should be hoisted.
 */
export function findUnhoistedRegistryDependencies(
  lockfile: PackageLock,
  platform?: PlatformContract,
): UnhoistedRegistryDependencyIssue[] {
  const packages = lockfile.packages ?? {};
  const issues: UnhoistedRegistryDependencyIssue[] = [];
  const seen = new Set<string>();

  for (const [key, entry] of Object.entries(packages)) {
    const parsed = parseNestedSaflibRegistryLockKey(key);
    if (!parsed || entry?.link) continue;
    if (packages[parsed.rootLockfileKey]) continue;

    if (platform && key.startsWith("saflib/")) {
      const platformKey = key.slice("saflib/".length);
      const platformNested = platform.lockPackages[platformKey];
      if (platformNested?.version) {
        const platformRoot = platform.lockPackages[parsed.rootLockfileKey];
        // Preserve only true dual-installs (root + different nested version).
        if (
          platformRoot?.version &&
          platformRoot.version !== platformNested.version
        ) {
          continue;
        }
      }
    }

    if (seen.has(parsed.dependency)) continue;
    seen.add(parsed.dependency);
    issues.push({
      kind: "unhoisted-registry-dependency",
      dependency: parsed.dependency,
      nestedLockfileKey: key,
      rootLockfileKey: parsed.rootLockfileKey,
      version: entry?.version,
    });
  }

  return issues.sort((a, b) => a.dependency.localeCompare(b.dependency));
}

export function hoistMisplacedLockfilePeers(
  lockfile: PackageLock,
  hazards: HoistingHazardIssue[],
): string[] {
  return hoistLockfileEntries(
    lockfile,
    hazards.map((hazard) => ({
      dependency: hazard.peer,
      nestedLockfileKey: hazard.saflibLockfileKey,
      rootLockfileKey: hazard.rootLockfileKey,
    })),
  );
}

export function hoistUnhoistedRegistryDependencies(
  lockfile: PackageLock,
  issues: UnhoistedRegistryDependencyIssue[],
): string[] {
  return hoistLockfileEntries(
    lockfile,
    issues.map((issue) => ({
      dependency: issue.dependency,
      nestedLockfileKey: issue.nestedLockfileKey,
      rootLockfileKey: issue.rootLockfileKey,
    })),
  );
}

function hoistLockfileEntries(
  lockfile: PackageLock,
  entries: Array<{
    dependency: string;
    nestedLockfileKey: string;
    rootLockfileKey: string;
  }>,
): string[] {
  const packages = lockfile.packages ?? {};
  const hoisted: string[] = [];

  for (const entry of entries) {
    if (packages[entry.rootLockfileKey]) continue;
    const nestedEntry = packages[entry.nestedLockfileKey];
    if (!nestedEntry) continue;

    packages[entry.rootLockfileKey] = { ...nestedEntry };
    const keysToDelete = Object.keys(packages).filter(
      (key) =>
        key === entry.nestedLockfileKey ||
        key.startsWith(`${entry.nestedLockfileKey}/`),
    );
    for (const key of keysToDelete) {
      delete packages[key];
    }
    hoisted.push(entry.dependency);
  }

  return hoisted;
}
