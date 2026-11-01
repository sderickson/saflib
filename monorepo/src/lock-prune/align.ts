import type {
  LockfileVersionSkewIssue,
  PackageLock,
  PlatformContract,
} from "./types.ts";
import {
  parseNestedSaflibRegistryLockKey,
  productKeyForPlatformLockKey,
} from "./paths.ts";

/**
 * Nested product installs under `saflib/` whose version does not match the
 * platform (same relative path preferred, else root). Reported only: whether
 * a product's install is sound is the dependency alignment check's question,
 * not whether it matches saflib's own lockfile.
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

    if (seen.has(`${parsed.dependency}:${platformLockfileKey}`)) continue;
    seen.add(`${parsed.dependency}:${platformLockfileKey}`);

    issues.push({
      kind: "lockfile-version-skew",
      dependency: parsed.dependency,
      productLockfileKey: key,
      productVersion: entry.version,
      platformVersion,
      platformLockfileKey,
      productAlignKey: productKeyForPlatformLockKey(platformLockfileKey),
      rootLockfileKey: parsed.rootLockfileKey,
    });
  }

  return issues.sort((a, b) => a.dependency.localeCompare(b.dependency));
}
