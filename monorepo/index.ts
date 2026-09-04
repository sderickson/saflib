export {
  checkPackageLayout,
  checkPackageLayoutFromInputs,
  DEFAULT_MAX_SOURCE_LINES,
  ROOT_TS_ALLOWLIST,
  isAllowedRootTsFile,
  listPackageJsonExportTargetFiles,
  type CheckPackageLayoutOptions,
  type CheckPackageLayoutFromInputsOptions,
  type PackageJsonLayoutFields,
  type PackageLayoutIssue,
  type PackageLayoutIssueKind,
} from "./src/package-layout.ts";

export {
  exportGlobForTopLevelSegment,
  importGlobForTopLevelSegment,
  importsFromExports,
  prepareNewPackageExports,
  resolveExportModulePathLayout,
  ROOT_IMPORT_CATCHALL,
  stripTemplateExportPlaceholders,
  stripTemplateImportPlaceholders,
  upsertExplicitExport,
  upsertExportGlob,
  upsertImportGlob,
  upsertPackageExportForModule,
  upsertPackageJsonExportsForModule,
  type ExportModulePathLayout,
} from "./src/package-exports.ts";

export {
  PACKAGE_KINDS,
  PACKAGE_KIND_IDENTIFIERS,
  classifySafPackage,
  hasSdkRequestsExport,
  isPackageKind,
  parseSafPackageJson,
  type PackageKind,
  type PackageKindClassification,
  type SafPackageJson,
} from "./src/package-kind.ts";

export {
  checkExportPatternCoverage,
  checkExports,
  collectPublicExportRepoPaths,
  computeExportsMap,
  generateExports,
  leafExportRemapDiffs,
  listExportableFiles,
  packageHasWorkflowMarkers,
  resolvePackageDir,
  sortExportsMap,
  type CheckExportsResult,
  type ExportsMap,
} from "./src/exports/generate-exports.ts";

export {
  buildPackageIndex,
  existsResolve,
  findMonorepoRoot,
  matchExportPattern,
  resolvePackageExportPath,
  resolveSpecifier,
  sortExportPatternKeys,
  type PackageIndex,
  type PackageInfo,
  type ResolveResult,
} from "./src/exports/package-index.ts";

// Hack so TS doesn't complain about dirname and filename
declare global {
  interface ImportMeta {
    dirname: string;
    filename: string;
  }
}
