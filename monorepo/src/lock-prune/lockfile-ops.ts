import { readFileSync } from "node:fs";
import type { LockPackageEntry, PackageLock, PlatformContract } from "./types.ts";
import {
  isIntentionalNestedInstallKey,
  lockfileKeyForPackage,
  packageNameFromNodeModulesSuffix,
  parseNestedSaflibRegistryLockKey,
  platformKeyForProductSaflibKey,
} from "./paths.ts";

export function deleteLockfileTree(
  packages: Record<string, LockPackageEntry | undefined>,
  rootKey: string,
): void {
  for (const key of Object.keys(packages)) {
    if (key === rootKey || key.startsWith(`${rootKey}/`)) {
      delete packages[key];
    }
  }
}

/** Copy a platform lock subtree onto a product lock key (and its descendants). */
export function copyLockfileTree(
  productPackages: Record<string, LockPackageEntry | undefined>,
  platformPackages: Record<string, LockPackageEntry | undefined>,
  platformSourceKey: string,
  productDestKey: string,
): void {
  deleteLockfileTree(productPackages, productDestKey);
  for (const [key, entry] of Object.entries(platformPackages)) {
    if (!entry) continue;
    if (key !== platformSourceKey && !key.startsWith(`${platformSourceKey}/`)) {
      continue;
    }
    const suffix = key.slice(platformSourceKey.length);
    productPackages[`${productDestKey}${suffix}`] = { ...entry };
  }

  // Optional/platform binaries often sit as *siblings* under the same
  // `…/node_modules/` (e.g. vitepress/node_modules/@esbuild/darwin-arm64 next
  // to vitepress/node_modules/esbuild), not nested under the package itself.
  const sourceEntry = platformPackages[platformSourceKey];
  const parentMarker = "/node_modules/";
  const parentIdx = platformSourceKey.lastIndexOf(parentMarker);
  if (!sourceEntry || parentIdx < 0) return;

  const platformParent = platformSourceKey.slice(
    0,
    parentIdx + parentMarker.length - 1,
  ); // …/node_modules
  const productParent = productDestKey.slice(
    0,
    productDestKey.lastIndexOf(parentMarker) + parentMarker.length - 1,
  );

  for (const field of [
    "dependencies",
    "optionalDependencies",
  ] as const) {
    const deps = sourceEntry[field];
    if (!deps || typeof deps !== "object") continue;
    for (const depName of Object.keys(deps as Record<string, string>)) {
      const platformDepKey = lockfileKeyForPackage(platformParent, depName);
      if (platformDepKey === platformSourceKey) continue;
      if (!platformPackages[platformDepKey]?.version) continue;
      const productDepKey = lockfileKeyForPackage(productParent, depName);
      copyLockfileTree(
        productPackages,
        platformPackages,
        platformDepKey,
        productDepKey,
      );
    }
  }
}

/**
 * Remove nested `saflib/…/node_modules/<dep>` copies, preserving installs that
 * match an intentional platform dual-install (same relative nest *and* a
 * different version at the platform root, e.g. vitepress/node_modules/esbuild).
 */
export function deleteNestedSaflibCopies(
  packages: Record<string, LockPackageEntry | undefined>,
  dependency: string,
  platform?: PlatformContract,
): void {
  for (const key of Object.keys(packages)) {
    const parsed = parseNestedSaflibRegistryLockKey(key);
    if (parsed?.dependency !== dependency) continue;
    // Only preserve dual-installs that mirror an intentional platform nest
    // (`vitepress/node_modules/esbuild`), not `saflib/node_modules/<pkg>` which
    // maps to the root `node_modules/<pkg>` and should be cleaned when aligning.
    const platformKey = platformKeyForProductSaflibKey(key);
    if (platformKey && platform && isTruePlatformDualInstall(platform, platformKey)) {
      continue;
    }
    deleteLockfileTree(packages, key);
  }
}

/**
 * Platform has this nest *and* a different version at the root — a real
 * dual-install worth preserving. Nested-only platform installs are not.
 */
export function isTruePlatformDualInstall(
  platform: PlatformContract,
  platformNestedKey: string,
): boolean {
  if (!isIntentionalNestedInstallKey(platformNestedKey)) return false;
  const nestedVersion = platform.lockPackages[platformNestedKey]?.version;
  if (!nestedVersion) return false;
  const dependency = packageNameFromNodeModulesSuffix(
    platformNestedKey.slice(
      platformNestedKey.lastIndexOf("/node_modules/") + "/node_modules/".length,
    ),
  );
  if (!dependency) return false;
  const rootVersion =
    platform.lockPackages[lockfileKeyForPackage("node_modules", dependency)]
      ?.version;
  return Boolean(rootVersion && rootVersion !== nestedVersion);
}

export function readPackageLock(lockfilePath: string): PackageLock {
  return JSON.parse(readFileSync(lockfilePath, "utf8")) as PackageLock;
}
