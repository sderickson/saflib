export { readSource } from "./src/graph/read-source.ts";
export { measureGraph } from "./src/graph/walk-graph.ts";
export { findPath } from "./src/graph/find-path.ts";
export {
  detectCycles,
  type DetectCyclesOptions,
  type Cycle,
} from "./src/graph/detect-cycles.ts";
export {
  assembleUsedBy,
  type ExportUsedBy,
  type ExportUsedByMap,
  type UsedByImporterUnit,
} from "./src/graph/assemble-used-by.ts";
export {
  collectPublicExportPathsFromTree,
  createTreeResolveImportTarget,
  resolveImportsMapSpecifier,
} from "./src/graph/tree-import-resolution.ts";
export {
  exportUsedByKey,
  moduleTargetFromImport,
  packageLocalPath,
  resolveRelative,
  stripTsExt,
  type ImportUsedBy,
} from "./src/graph/import-resolution.ts";
export {
  ANALYZER_VERSION,
  MemoryFactStore,
  buildFileSpecialty,
  countSourceLines,
  fileFactFromSource,
  specialtyExports,
  specialtyImports,
  specialtyLocalExportUsages,
  specialtyTables,
  specialtyTestCases,
  type FactStore,
  type FileExportFact,
  type FileFact,
  type FileImportFact,
  type FileSpecialty,
  type FileTableColumnFact,
  type FileTableFact,
  type FileTestCaseFact,
} from "./src/facts/index.ts";
export {
  collectPackageIssues,
  type PackageDetailForIssues,
  type PackageIssue,
  type PackageIssueKind,
  type UsedBy,
} from "./src/issues/index.ts";
export {
  analyzePackageFromWorkdirContext,
  analyzeWorkdirPackage,
  analyzeWorkdirPackages,
  buildWorkdirGraphContext,
  isGraphSourcePath,
  isScaffoldTemplatePath,
  isTestSourcePath,
  type WorkdirAnalyzeOptions,
  type WorkdirAnalyzeResult,
  type WorkdirGraphContext,
  type WorkdirPackageAnalyzeResult,
} from "./src/issues/workdir-analyze.ts";
export {
  buildPackageIndex,
  findMonorepoRoot,
  matchExportPattern,
  sortExportPatternKeys,
  resolvePackageExportPath,
  resolveSpecifier,
  existsResolve,
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
} from "./src/tsconfig/index.ts";
export type {
  MeasureGraphOptions,
  MeasureGraphResult,
  GraphWalkOptions,
  FindPathResult,
  PackageIndex,
  PackageInfo,
} from "./src/types.ts";
