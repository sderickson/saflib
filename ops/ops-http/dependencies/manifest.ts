import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";

/** One installed package version. */
export interface InstalledPackage {
  name: string;
  version: string;
  /** Depended on directly by one of the image's workspace packages. */
  direct: boolean;
}

export interface DependencyManifest {
  packages: InstalledPackage[];
  /** sha256 of the lockfile: a new value means a new set of packages. */
  lockfileHash: string;
  nodeVersion: string;
}

interface LockfileEntry {
  version?: string;
  link?: boolean;
  dev?: boolean;
  dependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

/** `node_modules/@scope/name` or `a/node_modules/b` → the package name. */
function nameFromKey(key: string): string | undefined {
  const i = key.lastIndexOf("node_modules/");
  return i === -1 ? undefined : key.slice(i + "node_modules/".length);
}

/**
 * What this image actually runs, from its lockfile (npm v7+ `packages` map).
 * Images built by `saf-docker` install from a lockfile pruned to the image's
 * workspace packages, so it lists exactly what's deployed. Dev dependencies,
 * workspace links and duplicate name@version entries are skipped.
 */
export function parseLockfile(raw: string, nodeVersion: string = process.version): DependencyManifest {
  const lock = JSON.parse(raw) as { packages?: Record<string, LockfileEntry> };
  const entries = Object.entries(lock.packages ?? {});
  const workspaceNames = new Set<string>();
  const direct = new Set<string>();
  for (const [key, entry] of entries) {
    if (key === "" || key.includes("node_modules/")) continue;
    // A workspace package (e.g. "hub/service/http"): its dependencies are direct.
    for (const deps of [entry.dependencies, entry.optionalDependencies]) {
      for (const name of Object.keys(deps ?? {})) direct.add(name);
    }
  }
  for (const [key, entry] of entries) {
    if (entry.link) {
      const name = nameFromKey(key);
      if (name) workspaceNames.add(name);
    }
  }
  const seen = new Set<string>();
  const packages: InstalledPackage[] = [];
  for (const [key, entry] of entries) {
    const name = nameFromKey(key);
    if (!name || entry.link || entry.dev || !entry.version || workspaceNames.has(name)) continue;
    const id = `${name}@${entry.version}`;
    if (seen.has(id)) continue;
    seen.add(id);
    packages.push({ name, version: entry.version, direct: direct.has(name) && !key.includes("/node_modules/") });
  }
  packages.sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version));
  return {
    packages,
    lockfileHash: createHash("sha256").update(raw).digest("hex"),
    nodeVersion,
  };
}

/** Default lockfile location in SAF images (`/app`, the image's workdir). */
export const DEFAULT_LOCKFILE = "/app/package-lock.json";

/** The image's manifest, or undefined when there's no lockfile (dev, tests). */
export function readManifest(lockfilePath: string = process.env.SAF_LOCKFILE ?? DEFAULT_LOCKFILE) {
  if (!existsSync(lockfilePath)) return undefined;
  return parseLockfile(readFileSync(lockfilePath, "utf8"));
}
