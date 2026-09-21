export const DEP_FIELDS = [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
] as const;

export type DepField = (typeof DEP_FIELDS)[number];

export interface PackageJsonDeps {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

export interface LockPackageEntry {
  version?: string;
  resolved?: string;
  link?: boolean;
  [key: string]: unknown;
}

export interface PackageLock {
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
  /** Product lock key that is missing or differs from the platform. */
  productLockfileKey: string;
  productVersion: string;
  platformVersion: string;
  /** Platform lock key to copy from (`node_modules/…` or e.g. `vitepress/node_modules/…`). */
  platformLockfileKey: string;
  /** Product lock key to write (`node_modules/…` or `saflib/vitepress/node_modules/…`). */
  productAlignKey: string;
  rootLockfileKey: string;
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
  /** Full `packages` map from `saflib/package-lock.json`. */
  lockPackages: Record<string, LockPackageEntry | undefined>;
}

export interface LockPruneAnalysis {
  rootDir: string;
  saflibDir: string;
  lockfilePath: string;
  issues: LockPruneIssue[];
  /** Deploy-package redundant deps — reported but not auto-removed. */
  warnings: RedundantDependencyIssue[];
}

export interface LockPruneOptions {
  rootDir?: string;
  yes?: boolean;
  check?: boolean;
  confirm?: (message: string) => Promise<boolean>;
}
