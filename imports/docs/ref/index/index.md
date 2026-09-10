[**@saflib/imports**](../index.md)

---

# index

## Classes

| Class                                         | Description                                       |
| --------------------------------------------- | ------------------------------------------------- |
| [MemoryFactStore](classes/MemoryFactStore.md) | In-memory FactStore for workdir / CI (no SQLite). |

## Interfaces

| Interface                                                                | Description                                                                                                         |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| [FactStore](interfaces/FactStore.md)                                     | -                                                                                                                   |
| [FileExportFact](interfaces/FileExportFact.md)                           | -                                                                                                                   |
| [FileFact](interfaces/FileFact.md)                                       | Content-addressed parse result for one file. `contentKey` is a git blob hash (Spec) or content hash (workdir / CI). |
| [FileImportFact](interfaces/FileImportFact.md)                           | -                                                                                                                   |
| [FileTableColumnFact](interfaces/FileTableColumnFact.md)                 | -                                                                                                                   |
| [FileTableFact](interfaces/FileTableFact.md)                             | -                                                                                                                   |
| [FileTestCaseFact](interfaces/FileTestCaseFact.md)                       | -                                                                                                                   |
| [PackageDetailForIssues](interfaces/PackageDetailForIssues.md)           | -                                                                                                                   |
| [PackageIssue](interfaces/PackageIssue.md)                               | -                                                                                                                   |
| [WorkdirAnalyzeOptions](interfaces/WorkdirAnalyzeOptions.md)             | -                                                                                                                   |
| [WorkdirAnalyzeResult](interfaces/WorkdirAnalyzeResult.md)               | -                                                                                                                   |
| [WorkdirGraphContext](interfaces/WorkdirGraphContext.md)                 | -                                                                                                                   |
| [WorkdirPackageAnalyzeResult](interfaces/WorkdirPackageAnalyzeResult.md) | -                                                                                                                   |

## Type Aliases

| Type Alias                                           | Description                                                                                                                                                                                                                    |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [FileSpecialty](type-aliases/FileSpecialty.md)       | Discriminated specialty for one file. `exports` and `imports` are on every kind; kind-only props are `testCases` (test) and `tables` (sql-table). `localExportUsages` is optional for older blob_facts rows (pre analyzer v8). |
| [PackageIssueKind](type-aliases/PackageIssueKind.md) | -                                                                                                                                                                                                                              |
| [UsedBy](type-aliases/UsedBy.md)                     | -                                                                                                                                                                                                                              |

## Variables

| Variable                                           | Description                                                  |
| -------------------------------------------------- | ------------------------------------------------------------ |
| [ANALYZER\_VERSION](variables/ANALYZER_VERSION.md) | Bump when specialty shape or extractors change incompatibly. |

## Functions

| Function                                                                          | Description                                                                                                                                             |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [analyzePackageFromWorkdirContext](functions/analyzePackageFromWorkdirContext.md) | Analyze one package from a pre-built [WorkdirGraphContext](interfaces/WorkdirGraphContext.md).                                                          |
| [analyzeWorkdirPackage](functions/analyzeWorkdirPackage.md)                       | Analyze a single package from the working tree.                                                                                                         |
| [analyzeWorkdirPackages](functions/analyzeWorkdirPackages.md)                     | Analyze one or more packages from the working tree.                                                                                                     |
| [buildFileSpecialty](functions/buildFileSpecialty.md)                             | Build FileSpecialty from source text via @saflib/parser extractors.                                                                                     |
| [buildWorkdirGraphContext](functions/buildWorkdirGraphContext.md)                 | Walk the tree once and build import/export specialties for graph analysis.                                                                              |
| [collectPackageIssues](functions/collectPackageIssues.md)                         | Graph-derived issues: dead exports/queries (plus merged layoutIssues). Same-file-only exports are not reported — self-use is enough to clear dead-code. |
| [collectPublicExportPathsFromTree](functions/collectPublicExportPathsFromTree.md) | Repo-relative paths that are public `package.json` export targets, derived from a commit tree (no filesystem).                                          |
| [countSourceLines](functions/countSourceLines.md)                                 | -                                                                                                                                                       |
| [createTreeResolveImportTarget](functions/createTreeResolveImportTarget.md)       | Resolve import specifiers to repo-relative paths using a commit tree (no FS). Handles `#` import maps, relative imports, and workspace package exports. |
| [fileFactFromSource](functions/fileFactFromSource.md)                             | -                                                                                                                                                       |
| [isGraphSourcePath](functions/isGraphSourcePath.md)                               | `.ts` / `.tsx` / `.vue` sources parsed for exports and import graph edges.                                                                              |
| [isScaffoldTemplatePath](functions/isScaffoldTemplatePath.md)                     | Workflow scaffold placeholders (`__target-name__.ts`, `handlers/__group-name__/`, …).                                                                   |
| [isTestSourcePath](functions/isTestSourcePath.md)                                 | Test / fixture / test-helper paths excluded from export inventory.                                                                                      |
| [matchExportPattern](functions/matchExportPattern.md)                             | Match a Node.js package.json `exports` subpath pattern.                                                                                                 |
| [resolveImportsMapSpecifier](functions/resolveImportsMapSpecifier.md)             | Resolve `#` entries from a package `imports` map (exact + pattern).                                                                                     |
| [sortExportPatternKeys](functions/sortExportPatternKeys.md)                       | Prefer longer (more specific) pattern keys, matching Node's best-match preference.                                                                      |
| [specialtyExports](functions/specialtyExports.md)                                 | -                                                                                                                                                       |
| [specialtyImports](functions/specialtyImports.md)                                 | -                                                                                                                                                       |
| [specialtyLocalExportUsages](functions/specialtyLocalExportUsages.md)             | -                                                                                                                                                       |
| [specialtyTables](functions/specialtyTables.md)                                   | -                                                                                                                                                       |
| [specialtyTestCases](functions/specialtyTestCases.md)                             | -                                                                                                                                                       |

## References

### applyCompositionRootReferences

Re-exports [applyCompositionRootReferences](../src/tsconfig/build-graph/functions/applyCompositionRootReferences.md)

---

### assembleUsedBy

Re-exports [assembleUsedBy](../src/graph/assemble-used-by/functions/assembleUsedBy.md)

---

### buildPackageIndex

Re-exports [buildPackageIndex](../src/resolve/functions/buildPackageIndex.md)

---

### buildReferenceGraph

Re-exports [buildReferenceGraph](../src/tsconfig/build-graph/functions/buildReferenceGraph.md)

---

### BuildReferenceGraphResult

Re-exports [BuildReferenceGraphResult](../src/tsconfig/build-graph/interfaces/BuildReferenceGraphResult.md)

---

### checkReferences

Re-exports [checkReferences](../src/tsconfig/generate/functions/checkReferences.md)

---

### CheckReferencesResult

Re-exports [CheckReferencesResult](../src/tsconfig/generate/interfaces/CheckReferencesResult.md)

---

### checkSnapshot

Re-exports [checkSnapshot](../src/snapshot/snapshot/functions/checkSnapshot.md)

---

### CheckSnapshotOptions

Re-exports [CheckSnapshotOptions](../src/snapshot/snapshot/interfaces/CheckSnapshotOptions.md)

---

### CheckSnapshotResult

Re-exports [CheckSnapshotResult](../src/snapshot/snapshot/interfaces/CheckSnapshotResult.md)

---

### Cycle

Re-exports [Cycle](../src/graph/detect-cycles/type-aliases/Cycle.md)

---

### detectCycles

Re-exports [detectCycles](../src/graph/detect-cycles/functions/detectCycles.md)

---

### DetectCyclesOptions

Re-exports [DetectCyclesOptions](../src/graph/detect-cycles/interfaces/DetectCyclesOptions.md)

---

### detectReferenceCycles

Re-exports [detectReferenceCycles](../src/tsconfig/detect-cycles/functions/detectReferenceCycles.md)

---

### existsResolve

Re-exports [existsResolve](../src/resolve/functions/existsResolve.md)

---

### ExportUsedBy

Re-exports [ExportUsedBy](../src/graph/assemble-used-by/type-aliases/ExportUsedBy.md)

---

### exportUsedByKey

Re-exports [exportUsedByKey](../src/graph/import-resolution/functions/exportUsedByKey.md)

---

### ExportUsedByMap

Re-exports [ExportUsedByMap](../src/graph/assemble-used-by/type-aliases/ExportUsedByMap.md)

---

### findMonorepoRoot

Re-exports [findMonorepoRoot](../src/resolve/functions/findMonorepoRoot.md)

---

### findPath

Re-exports [findPath](../src/graph/find-path/functions/findPath.md)

---

### FindPathResult

Re-exports [FindPathResult](../src/types/type-aliases/FindPathResult.md)

---

### formatRegression

Re-exports [formatRegression](../src/snapshot/snapshot/functions/formatRegression.md)

---

### generateReferences

Re-exports [generateReferences](../src/tsconfig/generate/functions/generateReferences.md)

---

### GenerateReferencesPreview

Re-exports [GenerateReferencesPreview](../src/tsconfig/generate/interfaces/GenerateReferencesPreview.md)

---

### generateSnapshot

Re-exports [generateSnapshot](../src/snapshot/snapshot/functions/generateSnapshot.md)

---

### GenerateSnapshotOptions

Re-exports [GenerateSnapshotOptions](../src/snapshot/snapshot/interfaces/GenerateSnapshotOptions.md)

---

### GraphWalkOptions

Re-exports [GraphWalkOptions](../src/types/type-aliases/GraphWalkOptions.md)

---

### ImportUsedBy

Re-exports [ImportUsedBy](../src/graph/import-resolution/interfaces/ImportUsedBy.md)

---

### isInternalReference

Re-exports [isInternalReference](../src/tsconfig/tsconfig-io/functions/isInternalReference.md)

---

### measureGraph

Re-exports [measureGraph](../src/graph/walk-graph/functions/measureGraph.md)

---

### MeasureGraphOptions

Re-exports [MeasureGraphOptions](../src/types/interfaces/MeasureGraphOptions.md)

---

### MeasureGraphResult

Re-exports [MeasureGraphResult](../src/types/interfaces/MeasureGraphResult.md)

---

### mergePackageReferences

Re-exports [mergePackageReferences](../src/tsconfig/tsconfig-io/functions/mergePackageReferences.md)

---

### MetricsSnapshot

Re-exports [MetricsSnapshot](../src/snapshot/snapshot/interfaces/MetricsSnapshot.md)

---

### moduleTargetFromImport

Re-exports [moduleTargetFromImport](../src/graph/import-resolution/functions/moduleTargetFromImport.md)

---

### PackageIndex

Re-exports [PackageIndex](../src/types/type-aliases/PackageIndex.md)

---

### PackageInfo

Re-exports [PackageInfo](../src/types/interfaces/PackageInfo.md)

---

### packageLocalPath

Re-exports [packageLocalPath](../src/graph/import-resolution/functions/packageLocalPath.md)

---

### PackageReferencePreview

Re-exports [PackageReferencePreview](../src/tsconfig/generate/interfaces/PackageReferencePreview.md)

---

### previewReferencesGenerate

Re-exports [previewReferencesGenerate](../src/tsconfig/generate/functions/previewReferencesGenerate.md)

---

### readSource

Re-exports [readSource](../src/graph/read-source/functions/readSource.md)

---

### ReferenceCycle

Re-exports [ReferenceCycle](../src/tsconfig/detect-cycles/type-aliases/ReferenceCycle.md)

---

### ReferenceGraph

Re-exports [ReferenceGraph](../src/tsconfig/build-graph/type-aliases/ReferenceGraph.md)

---

### ReferenceGraphNode

Re-exports [ReferenceGraphNode](../src/tsconfig/build-graph/interfaces/ReferenceGraphNode.md)

---

### resolvePackageExportPath

Re-exports [resolvePackageExportPath](../src/resolve/functions/resolvePackageExportPath.md)

---

### resolveRelative

Re-exports [resolveRelative](../src/graph/import-resolution/functions/resolveRelative.md)

---

### resolveSpecifier

Re-exports [resolveSpecifier](../src/resolve/functions/resolveSpecifier.md)

---

### resolveTsconfigEntry

Re-exports [resolveTsconfigEntry](../src/tsconfig/resolve-entry/functions/resolveTsconfigEntry.md)

---

### SnapshotBundles

Re-exports [SnapshotBundles](../src/snapshot/snapshot/interfaces/SnapshotBundles.md)

---

### SnapshotGraphStats

Re-exports [SnapshotGraphStats](../src/snapshot/snapshot/interfaces/SnapshotGraphStats.md)

---

### SnapshotRegression

Re-exports [SnapshotRegression](../src/snapshot/snapshot/interfaces/SnapshotRegression.md)

---

### SnapshotSuiteTiming

Re-exports [SnapshotSuiteTiming](../src/snapshot/snapshot/interfaces/SnapshotSuiteTiming.md)

---

### SnapshotTypecheck

Re-exports [SnapshotTypecheck](../src/snapshot/snapshot/interfaces/SnapshotTypecheck.md)

---

### stripTsExt

Re-exports [stripTsExt](../src/graph/import-resolution/functions/stripTsExt.md)

---

### UsedByImporterUnit

Re-exports [UsedByImporterUnit](../src/graph/assemble-used-by/interfaces/UsedByImporterUnit.md)

---

### workspaceDepsOf

Re-exports [workspaceDepsOf](../src/tsconfig/build-graph/functions/workspaceDepsOf.md)
