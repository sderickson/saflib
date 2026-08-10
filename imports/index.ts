export { measureGraph } from "./src/graph/walk-graph.ts";
export { findPath } from "./src/graph/find-path.ts";
export {
  detectCycles,
  type DetectCyclesOptions,
  type Cycle,
} from "./src/graph/detect-cycles.ts";
export {
  computeExportsMap,
  checkExports,
  checkExportPatternCoverage,
  generateExports,
  listExportableFiles,
  packageHasWorkflowMarkers,
  resolvePackageDir,
  type ExportsMap,
  type CheckExportsResult,
} from "./src/exports/generate-exports.ts";
export {
  buildPackageIndex,
  findMonorepoRoot,
  matchExportPattern,
  resolvePackageExportPath,
  resolveSpecifier,
} from "./src/resolve/index.ts";
export {
  generateSnapshot,
  checkSnapshot,
  formatRegression,
  type MetricsSnapshot,
  type SnapshotGraphStats,
  type SnapshotSuiteTiming,
  type SnapshotTypecheck,
  type SnapshotBundles,
  type GenerateSnapshotOptions,
  type CheckSnapshotOptions,
  type SnapshotRegression,
  type CheckSnapshotResult,
} from "./src/snapshot/snapshot.ts";
export {
  buildReferenceGraph,
  detectReferenceCycles,
  resolveTsconfigEntry,
  previewReferencesGenerate,
  generateReferences,
  checkReferences,
  workspaceDepsOf,
  mergePackageReferences,
  isInternalReference,
  applyCompositionRootReferences,
  type ReferenceGraph,
  type ReferenceGraphNode,
  type BuildReferenceGraphResult,
  type ReferenceCycle,
  type GenerateReferencesPreview,
  type PackageReferencePreview,
  type CheckReferencesResult,
} from "./src/references/index.ts";
export type {
  MeasureGraphOptions,
  MeasureGraphResult,
  GraphWalkOptions,
  FindPathResult,
} from "./src/types.ts";
