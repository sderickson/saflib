import type {
  LockfileVersionSkewIssue,
  PackageLock,
  PlatformContract,
} from "./types.ts";
import {
  isWorkspaceLockEntry,
  lockfileKeyForPackage,
  packageNameFromNodeModulesSuffix,
  parseNestedSaflibRegistryLockKey,
  productKeyForPlatformLockKey,
} from "./paths.ts";
import {
  copyLockfileTree,
  deleteLockfileTree,
  deleteNestedSaflibCopies,
} from "./lockfile-ops.ts";
import { isExactOverrideVersion } from "./platform.ts";
import type { LockPackageEntry } from "./types.ts";

function workspaceDirectDepNames(entry: LockPackageEntry): string[] {
  const names = new Set<string>();
  for (const field of [
    "dependencies",
    "devDependencies",
    "optionalDependencies",
  ] as const) {
    const deps = entry[field];
    if (!deps || typeof deps !== "object") continue;
    for (const name of Object.keys(deps as Record<string, string>)) {
      names.add(name);
    }
  }
  return [...names];
}

/**
 * Align targets from the platform lock:
 * - exact override pins at root `node_modules/<pkg>`
 * - intentional nested dual-installs: a workspace package's direct dep that
 *   resolves under `<workspace>/node_modules/<pkg>` *and* a different version
 *   also exists at the platform root (e.g. vitepress → esbuild). Nested-only
 *   installs (no root counterpart) are not dual-installs — products should
 *   hoist those to the root, not copy a phantom nest that npm never extracts.
 */
export function listPlatformAlignTargets(
  platform: PlatformContract,
): string[] {
  const targets = new Set<string>();

  for (const name of Object.keys(platform.overrides)) {
    if (!isExactOverrideVersion(platform.overrides[name])) continue;
    const rootKey = lockfileKeyForPackage("node_modules", name);
    if (platform.lockPackages[rootKey]?.version) {
      targets.add(rootKey);
    }
  }

  for (const [key, entry] of Object.entries(platform.lockPackages)) {
    if (!entry || !isWorkspaceLockEntry(key)) continue;
    for (const depName of workspaceDirectDepNames(entry)) {
      const nestedKey = lockfileKeyForPackage(`${key}/node_modules`, depName);
      const nestedVersion = platform.lockPackages[nestedKey]?.version;
      if (!nestedVersion) continue;
      const rootKey = lockfileKeyForPackage("node_modules", depName);
      const rootVersion = platform.lockPackages[rootKey]?.version;
      // True dual-install only: root + nested, different versions.
      if (!rootVersion || rootVersion === nestedVersion) continue;
      targets.add(nestedKey);
    }
  }

  return [...targets].sort();
}

/**
 * Product lock entries that are missing or differ from the platform align
 * targets (override roots + intentional nested dual-installs).
 */
export function findPlatformAlignmentGaps(
  lockfile: PackageLock,
  platform: PlatformContract,
): LockfileVersionSkewIssue[] {
  const packages = lockfile.packages ?? {};
  const issues: LockfileVersionSkewIssue[] = [];

  for (const platformKey of listPlatformAlignTargets(platform)) {
    const platformVersion = platform.lockPackages[platformKey]?.version;
    if (!platformVersion) continue;

    const productAlignKey = productKeyForPlatformLockKey(platformKey);
    const productEntry = packages[productAlignKey];
    if (productEntry?.version === platformVersion) continue;

    const afterNm = platformKey.includes("/node_modules/")
      ? platformKey.slice(platformKey.lastIndexOf("/node_modules/") + "/node_modules/".length)
      : platformKey.slice("node_modules/".length);
    const dependency =
      packageNameFromNodeModulesSuffix(afterNm) ?? platformKey;

    issues.push({
      kind: "lockfile-version-skew",
      dependency,
      productLockfileKey: productAlignKey,
      productVersion: productEntry?.version ?? "(missing)",
      platformVersion,
      platformLockfileKey: platformKey,
      productAlignKey,
      rootLockfileKey: lockfileKeyForPackage("node_modules", dependency),
    });
  }

  return issues.sort((a, b) => a.dependency.localeCompare(b.dependency));
}

/**
 * Nested product installs under `saflib/` whose version does not match the
 * platform (same relative path preferred, else root).
 */
export function findLockfileVersionSkew(
  lockfile: PackageLock,
  platform: PlatformContract,
): LockfileVersionSkewIssue[] {
  const packages = lockfile.packages ?? {};
  const issues: LockfileVersionSkewIssue[] = [];
  const seen = new Set<string>();

  for (const [key, entry] of Object.entries(packages)) {
    const parsed = parseNestedSaflibRegistryLockKey(key);
    if (!parsed || !entry?.version || entry.link) continue;

    const platformNestedKey = key.startsWith("saflib/")
      ? key.slice("saflib/".length)
      : undefined;
    const platformNestedEntry = platformNestedKey
      ? platform.lockPackages[platformNestedKey]
      : undefined;
    const platformRootEntry = platform.lockPackages[parsed.rootLockfileKey];
    const platformLockfileKey = platformNestedEntry?.version
      ? platformNestedKey!
      : platformRootEntry?.version
        ? parsed.rootLockfileKey
        : undefined;
    if (!platformLockfileKey) continue;

    const platformVersion =
      platform.lockPackages[platformLockfileKey]?.version ??
      platform.resolvedVersions.get(parsed.dependency);
    if (!platformVersion || platformVersion === entry.version) continue;

    // Gaps for intentional nested / override roots are reported by
    // findPlatformAlignmentGaps with the canonical align key.
    if (seen.has(`${parsed.dependency}:${platformLockfileKey}`)) continue;
    seen.add(`${parsed.dependency}:${platformLockfileKey}`);

    const productAlignKey = productKeyForPlatformLockKey(platformLockfileKey);
    // Avoid duplicate issues already covered as alignment gaps.
    if (
      packages[productAlignKey]?.version !== platformVersion &&
      listPlatformAlignTargets(platform).includes(platformLockfileKey)
    ) {
      continue;
    }

    issues.push({
      kind: "lockfile-version-skew",
      dependency: parsed.dependency,
      productLockfileKey: key,
      productVersion: entry.version,
      platformVersion,
      platformLockfileKey,
      productAlignKey,
      rootLockfileKey: parsed.rootLockfileKey,
    });
  }

  return issues.sort((a, b) => a.dependency.localeCompare(b.dependency));
}

/**
 * Copy platform lock trees onto the product lock for each skew/gap issue.
 * Preserves intentional dual-installs when cleaning leftover nested copies.
 */
export function alignSkewedLockfileEntries(
  lockfile: PackageLock,
  issues: LockfileVersionSkewIssue[],
  platform: PlatformContract,
): string[] {
  const packages = lockfile.packages ?? (lockfile.packages = {});
  const aligned: string[] = [];

  for (const issue of issues) {
    const platformEntry = platform.lockPackages[issue.platformLockfileKey];
    if (!platformEntry?.version) {
      deleteLockfileTree(packages, issue.productLockfileKey);
      aligned.push(issue.dependency);
      continue;
    }

    copyLockfileTree(
      packages,
      platform.lockPackages,
      issue.platformLockfileKey,
      issue.productAlignKey,
    );

    if (issue.productAlignKey === issue.rootLockfileKey) {
      deleteNestedSaflibCopies(packages, issue.dependency, platform);
    } else if (issue.productLockfileKey !== issue.productAlignKey) {
      deleteLockfileTree(packages, issue.productLockfileKey);
    }

    aligned.push(issue.dependency);
  }

  return aligned;
}

/** @deprecated Use {@link alignSkewedLockfileEntries}. */
export function removeNestedLockfileEntries(
  lockfile: PackageLock,
  issues: LockfileVersionSkewIssue[],
  platform?: PlatformContract,
): string[] {
  if (platform) {
    return alignSkewedLockfileEntries(lockfile, issues, platform);
  }
  const packages = lockfile.packages ?? {};
  const removed: string[] = [];
  for (const issue of issues) {
    deleteLockfileTree(packages, issue.productLockfileKey);
    removed.push(issue.dependency);
  }
  return removed;
}

/**
 * @deprecated Root override skew is now a hard alignment gap via
 * {@link findPlatformAlignmentGaps}. Kept for test compatibility.
 */
export function findRootLockfileVersionSkew(
  lockfile: PackageLock,
  platform: PlatformContract,
): Array<{
  kind: "root-lockfile-version-skew";
  dependency: string;
  productLockfileKey: string;
  productVersion: string;
  platformVersion: string;
}> {
  return findPlatformAlignmentGaps(lockfile, platform)
    .filter((issue) => issue.platformLockfileKey.startsWith("node_modules/"))
    .filter((issue) => isExactOverrideVersion(platform.overrides[issue.dependency]))
    .map((issue) => ({
      kind: "root-lockfile-version-skew" as const,
      dependency: issue.dependency,
      productLockfileKey: issue.productLockfileKey,
      productVersion: issue.productVersion,
      platformVersion: issue.platformVersion,
    }));
}
