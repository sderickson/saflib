[**@saflib/monorepo**](../index.md)

---

# index

## Type Aliases

| Type Alias                                   | Description                                                                                                                                                                                                                                            |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [ReturnsError](type-aliases/ReturnsError.md) | An object with either a `result` or an `error`. Async functions which are exported by packages, such as database queries and integration calls, should use this for their return types. This way errors are typed and can be handled with type safety. |

## Variables

| Variable                                                  | Description                                   |
| --------------------------------------------------------- | --------------------------------------------- |
| [ROOT_IMPORT_CATCHALL](variables/ROOT_IMPORT_CATCHALL.md) | Catch-all only when `exports` includes `./*`. |

## Functions

| Function                                                                        | Description                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [importGlobForTopLevelSegment](functions/importGlobForTopLevelSegment.md)       | Derive package-local `#` import maps from `exports`.                                                                                                                                                               |
| [importsFromExports](functions/importsFromExports.md)                           | Build a default `imports` map from an `exports` map.                                                                                                                                                               |
| [stripTemplateImportPlaceholders](functions/stripTemplateImportPlaceholders.md) | Remove template placeholder import keys/values (e.g. `#__group-name__/*`).                                                                                                                                         |
| [throwError](functions/throwError.md)                                           | If a Promise which uses ReturnsError is unlikely to error, use this function to throw a chained error and return the result. **Use this function responsibly.** By using it you declare "I bet this won't happen". |
| [upsertImportGlob](functions/upsertImportGlob.md)                               | -                                                                                                                                                                                                                  |

## References

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

### DEFAULT_MAX_SOURCE_LINES

Re-exports [DEFAULT_MAX_SOURCE_LINES](../src/package-layout/variables/DEFAULT_MAX_SOURCE_LINES.md)

---

### exportGlobForTopLevelSegment

Re-exports [exportGlobForTopLevelSegment](../src/package-exports/functions/exportGlobForTopLevelSegment.md)

---

### ExportModulePathLayout

Re-exports [ExportModulePathLayout](../src/package-exports/interfaces/ExportModulePathLayout.md)

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

### listPackageJsonExportTargetFiles

Re-exports [listPackageJsonExportTargetFiles](../src/package-layout/functions/listPackageJsonExportTargetFiles.md)

---

### PACKAGE_KIND_IDENTIFIERS

Re-exports [PACKAGE_KIND_IDENTIFIERS](../src/package-kind/variables/PACKAGE_KIND_IDENTIFIERS.md)

---

### PACKAGE_KINDS

Re-exports [PACKAGE_KINDS](../src/package-kind/variables/PACKAGE_KINDS.md)

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

### ROOT_TS_ALLOWLIST

Re-exports [ROOT_TS_ALLOWLIST](../src/package-layout/variables/ROOT_TS_ALLOWLIST.md)

---

### SafPackageJson

Re-exports [SafPackageJson](../src/package-kind/interfaces/SafPackageJson.md)

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
