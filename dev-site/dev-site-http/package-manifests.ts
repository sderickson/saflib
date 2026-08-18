/**
 * Load package.json manifests from a git commit (no checkout).
 */
import {
  classifySafPackage,
  parseSafPackageJson,
  type PackageKind,
  type ReturnsError,
  type SafPackageJson,
} from "@saflib/monorepo";
import { listTree, readBlobs, type GitCommandError } from "@saflib/git";
import { EXCLUDE_DIRS, packageRootsFromPackageJsonPaths } from "./classify.ts";

export interface PackageManifest {
  packageName: string;
  /** Directory relative to repo root (posix, no trailing slash). "" for root. */
  directory: string;
  json: SafPackageJson;
  kind: PackageKind;
  mixedIdentifiers: string[];
}

export type LoadPackageManifestsResult = ReturnsError<
  PackageManifest[],
  GitCommandError
>;

/**
 * Read every package.json at `commitHash` and classify it.
 */
export function loadPackageManifests(
  repoRoot: string,
  commitHash: string,
): LoadPackageManifestsResult {
  const treeResult = listTree(repoRoot, commitHash);
  if (treeResult.error) return { error: treeResult.error };

  const packageJsonEntries = treeResult.result.filter((e) => {
    const parts = e.path.split("/");
    if (parts.some((p) => EXCLUDE_DIRS.has(p))) return false;
    return e.path === "package.json" || e.path.endsWith("/package.json");
  });

  const blobs = readBlobs(
    repoRoot,
    packageJsonEntries.map((e) => e.blobHash),
  );
  if (blobs.error) return { error: blobs.error };

  const nameByPath = new Map<string, string>();
  const jsonByPath = new Map<string, SafPackageJson>();
  for (const entry of packageJsonEntries) {
    const text = blobs.result.get(entry.blobHash);
    if (text === undefined) continue;
    const json = parseSafPackageJson(text);
    if (!json) continue;
    jsonByPath.set(entry.path, json);
    if (typeof json.name === "string") nameByPath.set(entry.path, json.name);
  }

  const roots = packageRootsFromPackageJsonPaths(
    packageJsonEntries.map((e) => e.path),
    nameByPath,
  );

  const manifests: PackageManifest[] = [];
  for (const root of roots) {
    const pkgJsonPath = root.directory
      ? `${root.directory}/package.json`
      : "package.json";
    const json = jsonByPath.get(pkgJsonPath) ?? {};
    const classified = classifySafPackage({ ...json, name: root.packageName });
    manifests.push({
      packageName: root.packageName,
      directory: root.directory,
      json,
      kind: classified.kind,
      mixedIdentifiers: classified.mixedIdentifiers,
    });
  }
  return { result: manifests };
}

export function manifestByPackageName(
  manifests: PackageManifest[],
): Map<string, PackageManifest> {
  return new Map(manifests.map((m) => [m.packageName, m]));
}

/** Repo-relative package directory → manifest (productRoot + metrics.directory). */
export function manifestByRepoDirectory(
  manifests: PackageManifest[],
): Map<string, PackageManifest> {
  return new Map(manifests.map((m) => [m.directory, m]));
}

export function specPackageNamesFromDeps(
  manifestsByName: Map<string, PackageManifest>,
  pkg: PackageManifest | undefined,
): string[] {
  if (!pkg) return [];
  const deps = Object.keys(pkg.json.dependencies ?? {});
  return deps
    .filter((name) => manifestsByName.get(name)?.kind === "spec")
    .sort();
}

export function packagesDependingOn(
  manifests: PackageManifest[],
  packageName: string,
  kind: PackageKind,
): PackageManifest[] {
  return manifests.filter((m) => {
    if (m.kind !== kind) return false;
    return Boolean(m.json.dependencies?.[packageName]);
  });
}
