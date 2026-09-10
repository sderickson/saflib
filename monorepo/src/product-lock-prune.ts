import {
  existsSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { createInterface } from "node:readline/promises";
import path from "node:path";
import { stdin as input, stdout as output } from "node:process";
import { buildPackageIndex, findMonorepoRoot } from "@saflib/imports";

const DEP_FIELDS = [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
] as const;

type DepField = (typeof DEP_FIELDS)[number];

interface PackageJsonDeps {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

interface LockPackageEntry {
  version?: string;
  resolved?: string;
  link?: boolean;
  [key: string]: unknown;
}

interface PackageLock {
  packages?: Record<string, LockPackageEntry | undefined>;
}

export interface HoistingHazardIssue {
  kind: "hoisting-hazard";
  peer: string;
  requiredBy: string;
  saflibLockfileKey: string;
  rootLockfileKey: string;
}

export interface CompetingDependencyIssue {
  kind: "competing-dependency";
  packageJsonPath: string;
  packageName: string;
  field: DepField;
  dependency: string;
  productSpec: string;
  saflibSpecs: string[];
}

export interface RedundantDependencyIssue {
  kind: "redundant-dependency";
  packageJsonPath: string;
  packageName: string;
  field: DepField;
  dependency: string;
  spec: string;
}

export interface StaleLockfileIssue {
  kind: "stale-lockfile";
  lockfilePath: string;
  stalePaths: string[];
  removedCount: number;
}

export interface UnhoistedRegistryDependencyIssue {
  kind: "unhoisted-registry-dependency";
  dependency: string;
  nestedLockfileKey: string;
  rootLockfileKey: string;
  version?: string;
}

export interface LockfileVersionSkewIssue {
  kind: "lockfile-version-skew";
  dependency: string;
  productLockfileKey: string;
  productVersion: string;
  platformVersion: string;
}

/**
 * Product root `node_modules/<dep>` does not match the platform lock version for a
 * package pinned in `saflib/package.json` overrides (e.g. vite 8.3 peer-hoisted
 * while the platform lock resolves 8.0.13).
 */
export interface RootLockfileVersionSkewIssue {
  kind: "root-lockfile-version-skew";
  dependency: string;
  productLockfileKey: string;
  productVersion: string;
  platformVersion: string;
}

export interface PlatformOverrideSyncIssue {
  kind: "platform-override-sync";
  missing: Record<string, string>;
  changed: Record<string, { from: string; to: string }>;
}

export type LockPruneIssue =
  | HoistingHazardIssue
  | CompetingDependencyIssue
  | RedundantDependencyIssue
  | StaleLockfileIssue
  | UnhoistedRegistryDependencyIssue
  | LockfileVersionSkewIssue
  | PlatformOverrideSyncIssue;

export interface PlatformContract {
  overrides: Record<string, string>;
  resolvedVersions: Map<string, string>;
  /** Full `packages` map from `saflib/package-lock.json` (for copying root trees). */
  lockPackages: Record<string, LockPackageEntry | undefined>;
}

export interface LockPruneAnalysis {
  rootDir: string;
  saflibDir: string;
  lockfilePath: string;
  issues: LockPruneIssue[];
  warnings: RedundantDependencyIssue[];
  /**
   * Override-pin root versions that differ from saflib/package-lock.json.
   * Advisory only — do not rewrite the product lockfile; rely on npm overrides
   * + `npm install` so the lock stays npm-authored.
   */
  rootLockSkewWarnings: RootLockfileVersionSkewIssue[];
}

export interface LockPruneOptions {
  rootDir?: string;
  yes?: boolean;
  check?: boolean;
  confirm?: (message: string) => Promise<boolean>;
}

function isWorkspaceLockEntry(key: string): boolean {
  return key !== "" && !key.includes("node_modules/");
}

function isSaflibPackageDir(rootDir: string, packageDir: string): boolean {
  const saflibRoot = path.resolve(rootDir, "saflib");
  const resolvedPackageDir = path.resolve(packageDir);
  const rel = path
    .relative(saflibRoot, resolvedPackageDir)
    .split(path.sep)
    .join("/");
  return !rel.startsWith("..") && !path.isAbsolute(rel);
}

function isProductOwnedDependencyName(name: string, spec: string): boolean {
  if (name.startsWith("@saflib/")) return true;
  if (spec === "*") return true;
  if (spec.startsWith("workspace:")) return true;
  if (spec.startsWith("file:")) return true;
  return false;
}

function collectDependencySpecs(
  pkg: PackageJsonDeps,
): Array<{ field: DepField; name: string; spec: string }> {
  const out: Array<{ field: DepField; name: string; spec: string }> = [];
  for (const field of DEP_FIELDS) {
    const deps = pkg[field];
    if (!deps) continue;
    for (const [name, spec] of Object.entries(deps)) {
      out.push({ field, name, spec });
    }
  }
  return out;
}

function lockfileKeyForPackage(nodeModulesPrefix: string, packageName: string): string {
  if (packageName.startsWith("@")) {
    const [scope, name] = packageName.split("/");
    return path.posix.join(nodeModulesPrefix, scope, name);
  }
  return path.posix.join(nodeModulesPrefix, packageName);
}

function packageNameFromRootLockfileKey(key: string): string | undefined {
  if (!key.startsWith("node_modules/")) return undefined;
  return key.slice("node_modules/".length);
}

function parseNestedSaflibRegistryLockKey(
  key: string,
): { dependency: string; rootLockfileKey: string } | undefined {
  const marker = "/node_modules/";
  if (!key.startsWith("saflib/") || !key.includes(marker)) return undefined;

  const nodeModulesIdx = key.lastIndexOf(marker);
  const afterNodeModules = key.slice(nodeModulesIdx + marker.length);
  let dependency: string | undefined;
  if (afterNodeModules.startsWith("@")) {
    const [scope, name] = afterNodeModules.split("/");
    if (!scope || !name || afterNodeModules.includes("/", scope.length + 1)) {
      return undefined;
    }
    dependency = `${scope}/${name}`;
  } else if (afterNodeModules && !afterNodeModules.includes("/")) {
    dependency = afterNodeModules;
  } else {
    return undefined;
  }

  return {
    dependency,
    rootLockfileKey: lockfileKeyForPackage("node_modules", dependency),
  };
}

/** Registry versions the platform lockfile resolved (source of truth for alignment). */
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
  let lockPackages: Record<string, LockPackageEntry | undefined> = {};
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

  return { overrides, resolvedVersions, lockPackages };
}

function buildCanonicalRegistrySpecs(
  rootDir: string,
  packageIndex: ReturnType<typeof buildPackageIndex>,
  platform: PlatformContract,
): Map<string, string> {
  const saflibSpecs = buildSaflibSpecs(rootDir, packageIndex);
  const canonical = new Map<string, string>();

  for (const [name] of saflibSpecs) {
    if (platform.overrides[name]) {
      canonical.set(name, platform.overrides[name]);
    } else if (platform.resolvedVersions.has(name)) {
      canonical.set(name, platform.resolvedVersions.get(name)!);
    }
  }

  for (const [name, specs] of saflibSpecs) {
    if (canonical.has(name)) continue;
    canonical.set(name, [...specs].sort()[0]!);
  }

  return canonical;
}

function specsMatchForPlatform(productSpec: string, canonicalSpec: string): boolean {
  if (productSpec === canonicalSpec) return true;
  if (productSpec === "*" || productSpec.startsWith("workspace:")) return true;
  return false;
}

function listInstalledPackageNames(nodeModulesDir: string): Set<string> {
  const names = new Set<string>();
  if (!existsSync(nodeModulesDir)) return names;

  for (const entry of readdirSync(nodeModulesDir)) {
    if (entry.startsWith(".")) continue;
    const entryPath = path.join(nodeModulesDir, entry);
    if (entry.startsWith("@")) {
      let scopedEntries: string[];
      try {
        scopedEntries = readdirSync(entryPath);
      } catch {
        continue;
      }
      for (const scopedEntry of scopedEntries) {
        if (existsSync(path.join(entryPath, scopedEntry, "package.json"))) {
          names.add(`${entry}/${scopedEntry}`);
        }
      }
      continue;
    }
    if (existsSync(path.join(entryPath, "package.json"))) {
      names.add(entry);
    }
  }

  return names;
}

function listPackageDirectories(nodeModulesDir: string): string[] {
  const dirs: string[] = [];
  if (!existsSync(nodeModulesDir)) return dirs;

  for (const entry of readdirSync(nodeModulesDir)) {
    if (entry.startsWith(".")) continue;
    const entryPath = path.join(nodeModulesDir, entry);
    if (entry.startsWith("@")) {
      let scopedEntries: string[];
      try {
        scopedEntries = readdirSync(entryPath);
      } catch {
        continue;
      }
      for (const scopedEntry of scopedEntries) {
        const pkgDir = path.join(entryPath, scopedEntry);
        if (existsSync(path.join(pkgDir, "package.json"))) {
          dirs.push(pkgDir);
        }
      }
      continue;
    }
    if (existsSync(path.join(entryPath, "package.json"))) {
      dirs.push(entryPath);
    }
  }

  return dirs;
}

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
        saflibLockfileKey: lockfileKeyForPackage(
          "saflib/node_modules",
          peer,
        ),
        rootLockfileKey: lockfileKeyForPackage("node_modules", peer),
      });
    }
  }

  return hazards.sort(
    (a, b) =>
      a.peer.localeCompare(b.peer) || a.requiredBy.localeCompare(b.requiredBy),
  );
}

function buildSaflibSpecs(
  rootDir: string,
  packageIndex: ReturnType<typeof buildPackageIndex>,
): Map<string, Set<string>> {
  const saflibSpecs = new Map<string, Set<string>>();

  for (const [, info] of packageIndex) {
    if (!isSaflibPackageDir(rootDir, info.dir)) continue;
    const pkg = JSON.parse(
      readFileSync(path.join(info.dir, "package.json"), "utf8"),
    ) as PackageJsonDeps;
    for (const { name, spec } of collectDependencySpecs(pkg)) {
      if (isProductOwnedDependencyName(name, spec)) continue;
      const specs = saflibSpecs.get(name) ?? new Set<string>();
      specs.add(spec);
      saflibSpecs.set(name, specs);
    }
  }

  return saflibSpecs;
}

export function findCompetingDependencies(
  rootDir: string,
  packageIndex: ReturnType<typeof buildPackageIndex>,
  platform: PlatformContract = readPlatformContract(rootDir),
): CompetingDependencyIssue[] {
  const saflibSpecs = buildSaflibSpecs(rootDir, packageIndex);
  const canonicalSpecs = buildCanonicalRegistrySpecs(rootDir, packageIndex, platform);
  const issues: CompetingDependencyIssue[] = [];

  for (const [, info] of packageIndex) {
    if (isSaflibPackageDir(rootDir, info.dir)) continue;
    const packageJsonPath = path.join(info.dir, "package.json");
    const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8")) as PackageJsonDeps;
    for (const { field, name, spec } of collectDependencySpecs(pkg)) {
      if (isProductOwnedDependencyName(name, spec)) continue;
      const ownedSpecs = saflibSpecs.get(name);
      if (!ownedSpecs) continue;
      const canonicalSpec = canonicalSpecs.get(name);
      const matchesCanonical =
        !canonicalSpec || specsMatchForPlatform(spec, canonicalSpec);
      if (ownedSpecs.has(spec) && matchesCanonical) continue;
      issues.push({
        kind: "competing-dependency",
        packageJsonPath,
        packageName: pkg.name ?? packageJsonPath,
        field,
        dependency: name,
        productSpec: spec,
        saflibSpecs: [
          ...new Set(
            canonicalSpec ? [canonicalSpec, ...ownedSpecs] : [...ownedSpecs],
          ),
        ].sort(),
      });
    }
  }

  return issues.sort(
    (a, b) =>
      a.dependency.localeCompare(b.dependency) ||
      a.packageJsonPath.localeCompare(b.packageJsonPath),
  );
}

function isDeployPackage(packageJsonPath: string, rootDir: string): boolean {
  const rel = path
    .relative(rootDir, packageJsonPath)
    .split(path.sep)
    .join("/");
  return rel === "deploy/package.json" || rel.startsWith("deploy/");
}

export function findRedundantDependencies(
  rootDir: string,
  packageIndex: ReturnType<typeof buildPackageIndex>,
  options: { fixableOnly?: boolean } = {},
): RedundantDependencyIssue[] {
  const saflibSpecs = buildSaflibSpecs(rootDir, packageIndex);
  const issues: RedundantDependencyIssue[] = [];

  for (const [, info] of packageIndex) {
    if (isSaflibPackageDir(rootDir, info.dir)) continue;
    const packageJsonPath = path.join(info.dir, "package.json");
    if (options.fixableOnly && isDeployPackage(packageJsonPath, rootDir)) {
      continue;
    }
    const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8")) as PackageJsonDeps;
    for (const { field, name, spec } of collectDependencySpecs(pkg)) {
      if (isProductOwnedDependencyName(name, spec)) continue;
      const ownedSpecs = saflibSpecs.get(name);
      if (!ownedSpecs?.has(spec)) continue;
      issues.push({
        kind: "redundant-dependency",
        packageJsonPath,
        packageName: pkg.name ?? packageJsonPath,
        field,
        dependency: name,
        spec,
      });
    }
  }

  return issues.sort(
    (a, b) =>
      a.dependency.localeCompare(b.dependency) ||
      a.packageJsonPath.localeCompare(b.packageJsonPath),
  );
}

export function findUnhoistedRegistryDependencies(
  lockfile: PackageLock,
): UnhoistedRegistryDependencyIssue[] {
  const packages = lockfile.packages ?? {};
  const issues: UnhoistedRegistryDependencyIssue[] = [];
  const seen = new Set<string>();

  for (const [key, entry] of Object.entries(packages)) {
    const parsed = parseNestedSaflibRegistryLockKey(key);
    if (!parsed || entry?.link) continue;
    if (packages[parsed.rootLockfileKey]) continue;
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
    const platformVersion = platform.resolvedVersions.get(parsed.dependency);
    if (!platformVersion || platformVersion === entry.version) continue;
    if (seen.has(parsed.dependency)) continue;
    seen.add(parsed.dependency);
    issues.push({
      kind: "lockfile-version-skew",
      dependency: parsed.dependency,
      productLockfileKey: key,
      productVersion: entry.version,
      platformVersion,
    });
  }

  return issues.sort((a, b) => a.dependency.localeCompare(b.dependency));
}

/**
 * Platform override pins must resolve at the product root to the same version as
 * `saflib/package-lock.json`. Catches peer-hoisted drift (e.g. vite 8.3 at root
 * while the platform lock and nested saflib copy are 8.0.13).
 */
export function findRootLockfileVersionSkew(
  lockfile: PackageLock,
  platform: PlatformContract,
): RootLockfileVersionSkewIssue[] {
  const packages = lockfile.packages ?? {};
  const issues: RootLockfileVersionSkewIssue[] = [];

  for (const name of Object.keys(platform.overrides).sort()) {
    const platformVersion = platform.resolvedVersions.get(name);
    if (!platformVersion) continue;
    const platformRootKey = lockfileKeyForPackage("node_modules", name);
    if (!platform.lockPackages[platformRootKey]?.version) continue;

    const rootKey = platformRootKey;
    const entry = packages[rootKey];
    const productVersion = entry?.link ? undefined : entry?.version;
    if (productVersion === platformVersion) continue;

    issues.push({
      kind: "root-lockfile-version-skew",
      dependency: name,
      productLockfileKey: rootKey,
      productVersion: productVersion ?? "(missing)",
      platformVersion,
    });
  }

  return issues;
}

export function findPlatformOverrideDrift(
  rootDir: string,
  platform: PlatformContract,
): PlatformOverrideSyncIssue | null {
  const productPkgPath = path.join(rootDir, "package.json");
  const productPkg = JSON.parse(readFileSync(productPkgPath, "utf8")) as {
    overrides?: Record<string, string>;
  };
  const productOverrides = productPkg.overrides ?? {};
  const missing: Record<string, string> = {};
  const changed: Record<string, { from: string; to: string }> = {};

  for (const [name, version] of Object.entries(platform.overrides)) {
    if (productOverrides[name] === undefined) {
      missing[name] = version;
    } else if (productOverrides[name] !== version) {
      changed[name] = { from: productOverrides[name], to: version };
    }
  }

  if (Object.keys(missing).length === 0 && Object.keys(changed).length === 0) {
    return null;
  }

  return { kind: "platform-override-sync", missing, changed };
}

export function pruneStaleLockfileEntries(
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

  for (const key of keysToDelete) {
    delete packages[key];
  }

  return {
    kind: "stale-lockfile",
    lockfilePath: path.join(rootDir, "package-lock.json"),
    stalePaths: [...stalePaths].sort(),
    removedCount: keysToDelete.size,
  };
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

export function removeNestedLockfileEntries(
  lockfile: PackageLock,
  issues: LockfileVersionSkewIssue[],
): string[] {
  const packages = lockfile.packages ?? {};
  const removed: string[] = [];

  for (const issue of issues) {
    const keysToDelete = Object.keys(packages).filter(
      (key) =>
        key === issue.productLockfileKey ||
        key.startsWith(`${issue.productLockfileKey}/`),
    );
    if (keysToDelete.length === 0) continue;
    for (const key of keysToDelete) {
      delete packages[key];
    }
    removed.push(issue.dependency);
  }

  return removed;
}

export function syncPlatformOverrides(
  rootDir: string,
  platform: PlatformContract,
): string[] {
  const productPkgPath = path.join(rootDir, "package.json");
  const productPkg = JSON.parse(readFileSync(productPkgPath, "utf8")) as {
    overrides?: Record<string, string>;
  };
  const nextOverrides = { ...(productPkg.overrides ?? {}) };
  const applied: string[] = [];

  for (const [name, version] of Object.entries(platform.overrides)) {
    if (nextOverrides[name] === version) continue;
    nextOverrides[name] = version;
    applied.push(`${name}@${version}`);
  }

  if (applied.length === 0) return applied;

  productPkg.overrides = nextOverrides;
  writeFileSync(productPkgPath, `${JSON.stringify(productPkg, null, 2)}\n`);
  return applied;
}

/** True when `rootDir` is a product monorepo with a nested `saflib/` workspace. */
export function isEmbeddedProductMonorepo(rootDir: string): boolean {
  return existsSync(path.join(path.resolve(rootDir), "saflib", "package.json"));
}

export function analyzeProductLockPrune(rootDir: string): LockPruneAnalysis {
  const saflibDir = path.join(rootDir, "saflib");
  if (!isEmbeddedProductMonorepo(rootDir)) {
    throw new Error(
      "saf-monorepo lock-prune requires a product repo with an embedded saflib/ workspace. Run from the product root.",
    );
  }

  const lockfilePath = path.join(rootDir, "package-lock.json");
  if (!existsSync(lockfilePath)) {
    return {
      rootDir,
      saflibDir,
      lockfilePath,
      issues: [],
      warnings: [],
      rootLockSkewWarnings: [],
    };
  }

  const platform = readPlatformContract(rootDir);
  const packageIndex = buildPackageIndex(rootDir);
  const lockfile = JSON.parse(readFileSync(lockfilePath, "utf8")) as PackageLock;
  const redundant = findRedundantDependencies(rootDir, packageIndex);
  const fixableRedundant = findRedundantDependencies(rootDir, packageIndex, {
    fixableOnly: true,
  });
  const warnings = redundant.filter(
    (issue) =>
      !fixableRedundant.some(
        (fixable) =>
          fixable.packageJsonPath === issue.packageJsonPath &&
          fixable.dependency === issue.dependency &&
          fixable.field === issue.field,
      ),
  );
  const rootLockSkewWarnings = findRootLockfileVersionSkew(lockfile, platform);
  const issues: LockPruneIssue[] = [
    ...fixableRedundant,
    ...findCompetingDependencies(rootDir, packageIndex, platform),
    ...findHoistingHazards(rootDir),
    ...findUnhoistedRegistryDependencies(lockfile),
    ...findLockfileVersionSkew(lockfile, platform),
  ];

  const overrideDrift = findPlatformOverrideDrift(rootDir, platform);
  if (overrideDrift) issues.push(overrideDrift);

  const staleLockfile = pruneStaleLockfileEntries(lockfile, rootDir);
  if (staleLockfile) issues.push(staleLockfile);

  return {
    rootDir,
    saflibDir,
    lockfilePath,
    issues,
    warnings,
    rootLockSkewWarnings,
  };
}

function formatIssue(issue: LockPruneIssue): string[] {
  switch (issue.kind) {
    case "hoisting-hazard":
      return [
        `${issue.peer} is only installed under saflib/node_modules but is a peer of root-hoisted ${issue.requiredBy}.`,
        `  move lockfile entry: ${issue.saflibLockfileKey} -> ${issue.rootLockfileKey}`,
      ];
    case "redundant-dependency":
      return [
        `product redundantly declares ${issue.dependency}@${issue.spec} (saflib already owns it).`,
        `  package: ${issue.packageName}`,
        `  file: ${issue.packageJsonPath}`,
        `  field: ${issue.field}`,
      ];
    case "competing-dependency":
      return [
        `product declares ${issue.dependency}@${issue.productSpec} but saflib owns ${issue.saflibSpecs.join(", ")}.`,
        `  package: ${issue.packageName}`,
        `  file: ${issue.packageJsonPath}`,
        `  field: ${issue.field}`,
      ];
    case "stale-lockfile":
      return [
        `package-lock.json has ${issue.stalePaths.length} stale workspace entr${issue.stalePaths.length === 1 ? "y" : "ies"} (${issue.removedCount} total keys to remove).`,
        ...issue.stalePaths.slice(0, 5).map((entry) => `  - ${entry}`),
        ...(issue.stalePaths.length > 5
          ? [`  - ... ${issue.stalePaths.length - 5} more`]
          : []),
      ];
    case "unhoisted-registry-dependency":
      return [
        `${issue.dependency}${issue.version ? `@${issue.version}` : ""} is locked under a saflib workspace path but missing from the product root.`,
        `  move lockfile entry: ${issue.nestedLockfileKey} -> ${issue.rootLockfileKey}`,
      ];
    case "lockfile-version-skew":
      return [
        `${issue.dependency} resolves to ${issue.productVersion} in the product lockfile but ${issue.platformVersion} in saflib/package-lock.json.`,
        `  remove nested lock entry: ${issue.productLockfileKey}`,
      ];
    case "platform-override-sync":
      return [
        "product root overrides drift from saflib platform pins.",
        ...Object.entries(issue.missing).map(
          ([name, version]) => `  add override: ${name}@${version}`,
        ),
        ...Object.entries(issue.changed).map(
          ([name, change]) =>
            `  update override: ${name}@${change.from} -> ${change.to}`,
        ),
      ];
  }
}

async function defaultConfirm(message: string): Promise<boolean> {
  const rl = createInterface({ input, output });
  const answer = await rl.question(`${message} [y/N] `);
  rl.close();
  return /^y(es)?$/i.test(answer.trim());
}

function removeDeclaredDependency(
  packageJsonPath: string,
  field: DepField,
  dependency: string,
): void {
  const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8")) as PackageJsonDeps;
  const fieldDeps = pkg[field];
  if (!fieldDeps?.[dependency]) return;
  delete fieldDeps[dependency];
  if (Object.keys(fieldDeps).length === 0) {
    delete pkg[field];
  }
  writeFileSync(packageJsonPath, `${JSON.stringify(pkg, null, 2)}\n`);
}

function writePrunedLockfile(
  lockfilePath: string,
  mutate: (lockfile: PackageLock) => void,
): void {
  const lockfile = JSON.parse(readFileSync(lockfilePath, "utf8")) as PackageLock;
  mutate(lockfile);
  writeFileSync(lockfilePath, `${JSON.stringify(lockfile, null, 2)}\n`);
}

export function applyLockPruneFixes(analysis: LockPruneAnalysis): string[] {
  const applied: string[] = [];
  const hoistingHazards: HoistingHazardIssue[] = [];
  const unhoistedRegistry: UnhoistedRegistryDependencyIssue[] = [];
  const versionSkew: LockfileVersionSkewIssue[] = [];
  let wroteLockfile = false;
  const platform = readPlatformContract(analysis.rootDir);

  for (const issue of analysis.issues) {
    switch (issue.kind) {
      case "redundant-dependency":
        removeDeclaredDependency(
          issue.packageJsonPath,
          issue.field,
          issue.dependency,
        );
        applied.push(
          `removed redundant ${issue.dependency} from ${issue.packageJsonPath}`,
        );
        break;
      case "competing-dependency":
        removeDeclaredDependency(
          issue.packageJsonPath,
          issue.field,
          issue.dependency,
        );
        applied.push(
          `removed competing ${issue.dependency} from ${issue.packageJsonPath}`,
        );
        break;
      case "hoisting-hazard":
        hoistingHazards.push(issue);
        break;
      case "unhoisted-registry-dependency":
        unhoistedRegistry.push(issue);
        break;
      case "lockfile-version-skew":
        versionSkew.push(issue);
        break;
      case "platform-override-sync":
        for (const pin of syncPlatformOverrides(analysis.rootDir, platform)) {
          applied.push(`synced platform override ${pin}`);
        }
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

  if (
    hoistingHazards.length > 0 ||
    unhoistedRegistry.length > 0 ||
    versionSkew.length > 0
  ) {
    writePrunedLockfile(analysis.lockfilePath, (lockfile) => {
      if (hoistingHazards.length > 0) {
        for (const peer of hoistMisplacedLockfilePeers(lockfile, hoistingHazards)) {
          applied.push(`hoisted ${peer} to the product root in package-lock.json`);
        }
      }
      if (unhoistedRegistry.length > 0) {
        for (const dep of hoistUnhoistedRegistryDependencies(
          lockfile,
          unhoistedRegistry,
        )) {
          applied.push(
            `hoisted registry dependency ${dep} to the product root in package-lock.json`,
          );
        }
      }
      if (versionSkew.length > 0) {
        for (const dep of removeNestedLockfileEntries(lockfile, versionSkew)) {
          applied.push(
            `removed skewed lock entry for ${dep}; rerun npm install to align with saflib`,
          );
        }
      }
    });
    wroteLockfile = true;
  }

  if (wroteLockfile) {
    applied.push(`updated ${analysis.lockfilePath}`);
  }

  return applied;
}

export async function runLockPrune(
  options: LockPruneOptions = {},
): Promise<number> {
  const rootDir = path.resolve(
    options.rootDir ?? findMonorepoRoot(process.cwd()),
  );
  const analysis = analyzeProductLockPrune(rootDir);

  if (
    analysis.issues.length === 0 &&
    analysis.warnings.length === 0 &&
    analysis.rootLockSkewWarnings.length === 0
  ) {
    console.log("No product/saflib workspace issues found.");
    return 0;
  }

  console.log(`Checked ${analysis.rootDir}`);
  console.log("");

  if (analysis.warnings.length > 0) {
    console.log("Warnings (not auto-fixed for deploy packages):");
    for (const warning of analysis.warnings) {
      console.log(
        `  ${warning.dependency}@${warning.spec} in ${warning.packageJsonPath} is redundant (saflib already owns it).`,
      );
    }
    console.log("");
  }

  if (analysis.rootLockSkewWarnings.length > 0) {
    console.log(
      "Warnings (override root skew — not auto-fixed; rely on npm overrides + install):",
    );
    for (const skew of analysis.rootLockSkewWarnings) {
      console.log(
        `  ${skew.dependency} at product root is ${skew.productVersion} but saflib lock has ${skew.platformVersion} (${skew.productLockfileKey}).`,
      );
    }
    console.log("");
  }

  if (analysis.issues.length === 0) {
    return 0;
  }

  for (const issue of analysis.issues) {
    for (const line of formatIssue(issue)) {
      console.log(line);
    }
    console.log("");
  }

  if (options.check) {
    console.log("Check mode: no changes made.");
    return 1;
  }

  const confirm = options.confirm ?? defaultConfirm;
  const shouldFix =
    options.yes === true ||
    (await confirm("Apply fixes for the issues above?"));

  if (!shouldFix) {
    console.log("No changes made.");
    return 1;
  }

  const applied = applyLockPruneFixes(analysis);
  for (const line of applied) {
    console.log(`fixed: ${line}`);
  }
  console.log("");
  console.log("Run `npm install` from the product root to refresh node_modules.");
  return 0;
}
