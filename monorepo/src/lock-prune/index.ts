export type {
  CompetingDependencyIssue,
  DepField,
  HoistingHazardIssue,
  LockfileVersionSkewIssue,
  LockPackageEntry,
  LockPruneAnalysis,
  LockPruneIssue,
  LockPruneOptions,
  PackageLock,
  PlatformContract,
  PlatformOverrideSyncIssue,
  StaleLockfileIssue,
  UnhoistedRegistryDependencyIssue,
} from "./types.ts";

export {
  isEmbeddedProductMonorepo,
  isExactOverrideVersion,
  readPlatformContract,
} from "./platform.ts";

export { findLockfileVersionSkew } from "./align.ts";

export {
  findCompetingDependencies,
  findPlatformOverrideDrift,
  syncPlatformOverrides,
} from "./package-deps.ts";

export {
  findHoistingHazards,
  findUnhoistedRegistryDependencies,
  hoistMisplacedLockfilePeers,
  hoistUnhoistedRegistryDependencies,
} from "./hoist.ts";

export {
  findStaleLockfileEntries,
  pruneStaleLockfileEntries,
} from "./stale.ts";

export { isFixableIssue } from "./types.ts";
export { analyzeProductLockPrune } from "./analyze.ts";
export { applyLockPruneFixes } from "./apply.ts";
export { runLockPrune } from "./run.ts";
