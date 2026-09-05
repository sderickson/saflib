[**@saflib/monorepo**](../index.md)

---

# index

## Interfaces

| Interface                                | Description                                         |
| ---------------------------------------- | --------------------------------------------------- |
| [PackageInfo](interfaces/PackageInfo.md) | Package metadata indexed by workspace package name. |

## Type Aliases

| Type Alias                                     | Description                                                   |
| ---------------------------------------------- | ------------------------------------------------------------- |
| [PackageIndex](type-aliases/PackageIndex.md)   | Index of workspace packages discovered under a monorepo root. |
| [ResolveResult](type-aliases/ResolveResult.md) | -                                                             |

## Variables

| Variable                                                    | Description                                   |
| ----------------------------------------------------------- | --------------------------------------------- |
| [ROOT\_IMPORT\_CATCHALL](variables/ROOT_IMPORT_CATCHALL.md) | Catch-all only when `exports` includes `./*`. |

## Functions

| Function                                                                        | Description                                                                        |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| [buildPackageIndex](functions/buildPackageIndex.md)                             | Build a map of workspace package name → { dir, exports }.                          |
| [existsResolve](functions/existsResolve.md)                                     | Resolve a path candidate with common TS/Vue extensions and index files.            |
| [findMonorepoRoot](functions/findMonorepoRoot.md)                               | Walk up from `fromDir` until a package.json with a `workspaces` field is found.    |
| [importGlobForTopLevelSegment](functions/importGlobForTopLevelSegment.md)       | Derive package-local `#` import maps from `exports`.                               |
| [importsFromExports](functions/importsFromExports.md)                           | Build a default `imports` map from an `exports` map.                               |
| [matchExportPattern](functions/matchExportPattern.md)                           | Match a Node.js package.json `exports` subpath pattern.                            |
| [resolvePackageExportPath](functions/resolvePackageExportPath.md)               | Resolve a package export subpath to an absolute file path (no extension probing).  |
| [resolveSpecifier](functions/resolveSpecifier.md)                               | Resolve an import specifier relative to `fromFile` against the package index.      |
| [sortExportPatternKeys](functions/sortExportPatternKeys.md)                     | Prefer longer (more specific) pattern keys, matching Node's best-match preference. |
| [stripTemplateImportPlaceholders](functions/stripTemplateImportPlaceholders.md) | Remove template placeholder import keys/values (e.g. `#__group-name__/*`).         |
| [upsertImportGlob](functions/upsertImportGlob.md)                               | -                                                                                  |

## References

### checkExportPatternCoverage

Re-exports [checkExportPatternCoverage](../src/exports/generate-exports/functions/checkExportPatternCoverage.md)

---

### checkExports

Re-exports [checkExports](../src/exports/generate-exports/functions/checkExports.md)

---

### CheckExportsResult

Re-exports [CheckExportsResult](../src/exports/generate-exports/interfaces/CheckExportsResult.md)

---

### checkPackageLayout

Re-exports [checkPackageLayout](../src/package-layout/functions/checkPackageLayout.md)

---

### checkPackageLayoutFromInputs

Re-exports [checkPackageLayoutFromInputs](../src/package-layout/functions/checkPackageLayoutFromInputs.md)

---

### CheckPackageLayoutFromInputsOptions

Re-exports [CheckPackageLayoutFromInputsOptions](../src/package-layout/interfaces/CheckPackageLayoutFromInputsOptions.md)

---

### CheckPackageLayoutOptions

Re-exports [CheckPackageLayoutOptions](../src/package-layout/interfaces/CheckPackageLayoutOptions.md)

---

### classifySafPackage

Re-exports [classifySafPackage](../src/package-kind/functions/classifySafPackage.md)

---

### collectPublicExportRepoPaths

Re-exports [collectPublicExportRepoPaths](../src/exports/generate-exports/functions/collectPublicExportRepoPaths.md)

---

### computeExportsMap

Re-exports [computeExportsMap](../src/exports/generate-exports/functions/computeExportsMap.md)

---

### DEFAULT\_MAX\_SOURCE\_LINES

Re-exports [DEFAULT_MAX_SOURCE_LINES](../src/package-layout/variables/DEFAULT_MAX_SOURCE_LINES.md)

---

### exportGlobForTopLevelSegment

Re-exports [exportGlobForTopLevelSegment](../src/package-exports/functions/exportGlobForTopLevelSegment.md)

---

### ExportModulePathLayout

Re-exports [ExportModulePathLayout](../src/package-exports/interfaces/ExportModulePathLayout.md)

---

### ExportsMap

Re-exports [ExportsMap](../src/exports/generate-exports/type-aliases/ExportsMap.md)

---

### generateExports

Re-exports [generateExports](../src/exports/generate-exports/functions/generateExports.md)

---

### hasSdkRequestsExport

Re-exports [hasSdkRequestsExport](../src/package-kind/functions/hasSdkRequestsExport.md)

---

### isAllowedRootTsFile

Re-exports [isAllowedRootTsFile](../src/package-layout/functions/isAllowedRootTsFile.md)

---

### isPackageKind

Re-exports [isPackageKind](../src/package-kind/functions/isPackageKind.md)

---

### leafExportRemapDiffs

Re-exports [leafExportRemapDiffs](../src/exports/generate-exports/functions/leafExportRemapDiffs.md)

---

### listExportableFiles

Re-exports [listExportableFiles](../src/exports/generate-exports/functions/listExportableFiles.md)

---

### listPackageJsonExportTargetFiles

Re-exports [listPackageJsonExportTargetFiles](../src/package-layout/functions/listPackageJsonExportTargetFiles.md)

---

### PACKAGE\_KIND\_IDENTIFIERS

Re-exports [PACKAGE_KIND_IDENTIFIERS](../src/package-kind/variables/PACKAGE_KIND_IDENTIFIERS.md)

---

### PACKAGE\_KINDS

Re-exports [PACKAGE_KINDS](../src/package-kind/variables/PACKAGE_KINDS.md)

---

### packageHasWorkflowMarkers

Re-exports [packageHasWorkflowMarkers](../src/exports/generate-exports/functions/packageHasWorkflowMarkers.md)

---

### PackageJsonLayoutFields

Re-exports [PackageJsonLayoutFields](../src/package-layout/interfaces/PackageJsonLayoutFields.md)

---

### PackageKind

Re-exports [PackageKind](../src/package-kind/type-aliases/PackageKind.md)

---

### PackageKindClassification

Re-exports [PackageKindClassification](../src/package-kind/interfaces/PackageKindClassification.md)

---

### PackageLayoutIssue

Re-exports [PackageLayoutIssue](../src/package-layout/interfaces/PackageLayoutIssue.md)

---

### PackageLayoutIssueKind

Re-exports [PackageLayoutIssueKind](../src/package-layout/type-aliases/PackageLayoutIssueKind.md)

---

### parseSafPackageJson

Re-exports [parseSafPackageJson](../src/package-kind/functions/parseSafPackageJson.md)

---

### prepareNewPackageExports

Re-exports [prepareNewPackageExports](../src/package-exports/functions/prepareNewPackageExports.md)

---

### resolveExportModulePathLayout

Re-exports [resolveExportModulePathLayout](../src/package-exports/functions/resolveExportModulePathLayout.md)

---

### resolvePackageDir

Re-exports [resolvePackageDir](../src/exports/generate-exports/functions/resolvePackageDir.md)

---

### ROOT\_TS\_ALLOWLIST

Re-exports [ROOT_TS_ALLOWLIST](../src/package-layout/variables/ROOT_TS_ALLOWLIST.md)

---

### SafPackageJson

Re-exports [SafPackageJson](../src/package-kind/interfaces/SafPackageJson.md)

---

### sortExportsMap

Re-exports [sortExportsMap](../src/exports/generate-exports/functions/sortExportsMap.md)

---

### stripTemplateExportPlaceholders

Re-exports [stripTemplateExportPlaceholders](../src/package-exports/functions/stripTemplateExportPlaceholders.md)

---

### upsertExplicitExport

Re-exports [upsertExplicitExport](../src/package-exports/functions/upsertExplicitExport.md)

---

### upsertExportGlob

Re-exports [upsertExportGlob](../src/package-exports/functions/upsertExportGlob.md)

---

### upsertPackageExportForModule

Re-exports [upsertPackageExportForModule](../src/package-exports/functions/upsertPackageExportForModule.md)

---

### upsertPackageJsonExportsForModule

Re-exports [upsertPackageJsonExportsForModule](../src/package-exports/functions/upsertPackageJsonExportsForModule.md)
