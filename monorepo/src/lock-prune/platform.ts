import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { PackageLock, PlatformContract } from "./types.ts";
import { packageNameFromRootLockfileKey } from "./paths.ts";

/** Registry versions + overrides from the embedded saflib submodule. */
export function readPlatformContract(rootDir: string): PlatformContract {
  const saflibDir = path.join(rootDir, "saflib");
  const overrides: Record<string, string> = {};
  const saflibPkgPath = path.join(saflibDir, "package.json");
  if (existsSync(saflibPkgPath)) {
    const pkg = JSON.parse(readFileSync(saflibPkgPath, "utf8")) as {
      overrides?: Record<string, string>;
    };
    Object.assign(overrides, pkg.overrides ?? {});
  }

  const resolvedVersions = new Map<string, string>();
  let lockPackages: PackageLock["packages"] = {};
  const saflibLockPath = path.join(saflibDir, "package-lock.json");
  if (existsSync(saflibLockPath)) {
    const lock = JSON.parse(readFileSync(saflibLockPath, "utf8")) as PackageLock;
    lockPackages = lock.packages ?? {};
    for (const [key, entry] of Object.entries(lockPackages)) {
      const name = packageNameFromRootLockfileKey(key);
      if (!name || !entry?.version || entry.link) continue;
      resolvedVersions.set(name, entry.version);
    }
  }

  return { overrides, resolvedVersions, lockPackages: lockPackages ?? {} };
}

/** True for exact versions like `8.0.13`; false for `^5.0.0`, `~6.0.0`, `*`. */
export function isExactOverrideVersion(spec: unknown): boolean {
  if (typeof spec !== "string") return false;
  return /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(spec.trim());
}

/** True when `rootDir` is a product monorepo with a nested `saflib/` workspace. */
export function isEmbeddedProductMonorepo(rootDir: string): boolean {
  return existsSync(path.join(path.resolve(rootDir), "saflib", "package.json"));
}
