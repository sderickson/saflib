import path from "node:path";

/** Build `node_modules/<name>` or `<prefix>/<name>` lockfile keys. */
export function lockfileKeyForPackage(
  nodeModulesPrefix: string,
  packageName: string,
): string {
  if (packageName.startsWith("@")) {
    const [scope, name] = packageName.split("/");
    return path.posix.join(nodeModulesPrefix, scope, name);
  }
  return path.posix.join(nodeModulesPrefix, packageName);
}

/** Package name for a root `node_modules/<name>` lockfile key. */
export function packageNameFromRootLockfileKey(
  key: string,
): string | undefined {
  if (!key.startsWith("node_modules/")) return undefined;
  return packageNameFromNodeModulesSuffix(key.slice("node_modules/".length));
}

/**
 * Package name for the segment after a `/node_modules/` (or root `node_modules/`)
 * marker. Returns undefined when the suffix is not a bare package name (e.g. it
 * continues into nested paths).
 */
export function packageNameFromNodeModulesSuffix(
  afterNodeModules: string,
): string | undefined {
  if (!afterNodeModules) return undefined;
  if (afterNodeModules.startsWith("@")) {
    const [scope, name] = afterNodeModules.split("/");
    if (!scope || !name || afterNodeModules.includes("/", scope.length + 1)) {
      return undefined;
    }
    return `${scope}/${name}`;
  }
  if (afterNodeModules.includes("/")) return undefined;
  return afterNodeModules;
}

/**
 * Parse a product nested registry install under `saflib/…/node_modules/<pkg>`.
 * Only matches the leaf package install (not files nested under that package).
 */
export function parseNestedSaflibRegistryLockKey(
  key: string,
): { dependency: string; rootLockfileKey: string } | undefined {
  const marker = "/node_modules/";
  if (!key.startsWith("saflib/") || !key.includes(marker)) return undefined;

  const nodeModulesIdx = key.lastIndexOf(marker);
  const afterNodeModules = key.slice(nodeModulesIdx + marker.length);
  const dependency = packageNameFromNodeModulesSuffix(afterNodeModules);
  if (!dependency) return undefined;

  return {
    dependency,
    rootLockfileKey: lockfileKeyForPackage("node_modules", dependency),
  };
}

export function isWorkspaceLockEntry(key: string): boolean {
  return key !== "" && !key.includes("node_modules/");
}

/**
 * Platform lock keys that are intentional dual-installs under a workspace
 * package (e.g. `vitepress/node_modules/esbuild`, `monorepo/node_modules/eslint`).
 * Excludes root `node_modules/…` and deeper nests under those installs.
 */
export function isIntentionalNestedInstallKey(key: string): boolean {
  if (key.startsWith("node_modules/")) return false;
  const marker = "/node_modules/";
  const idx = key.indexOf(marker);
  if (idx < 0) return false;
  const before = key.slice(0, idx);
  if (before.includes("node_modules")) return false;
  return (
    packageNameFromNodeModulesSuffix(key.slice(idx + marker.length)) !==
    undefined
  );
}

/** Map a platform lock key onto the product lock key space. */
export function productKeyForPlatformLockKey(platformKey: string): string {
  if (platformKey.startsWith("node_modules/")) return platformKey;
  return `saflib/${platformKey}`;
}

/** Map a product `saflib/…` lock key back to the platform key space. */
export function platformKeyForProductSaflibKey(
  productKey: string,
): string | undefined {
  if (!productKey.startsWith("saflib/")) return undefined;
  return productKey.slice("saflib/".length);
}
