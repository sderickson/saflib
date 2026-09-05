[**@saflib/monorepo**](../../../index.md)

---

# src/exports/generate-exports

## Interfaces

| Interface                                                    | Description |
| ------------------------------------------------------------ | ----------- |
| [CheckExportsResult](interfaces/CheckExportsResult.md)       | -           |
| [ComputeExportsOptions](interfaces/ComputeExportsOptions.md) | -           |

## Type Aliases

| Type Alias                               | Description |
| ---------------------------------------- | ----------- |
| [ExportsMap](type-aliases/ExportsMap.md) | -           |

## Functions

| Function                                                                  | Description                                                                                                                                           |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| [checkExportPatternCoverage](functions/checkExportPatternCoverage.md)     | Verify export patterns cover every exportable file (hybrid / wildcard maps).                                                                          |
| [checkExports](functions/checkExports.md)                                 | Diff generated exports against committed `package.json` exports. Packages with wildcard export keys use pattern coverage validation instead.          |
| [collectPublicExportRepoPaths](functions/collectPublicExportRepoPaths.md) | Repo-relative paths of source files that are direct `package.json` export targets (including pattern exports). Used to skip dead-code on public API.  |
| [computeExportsMap](functions/computeExportsMap.md)                       | Compute the heuristic `exports` map for a package. `index.ts` in a directory maps to `./<dir>` (or `.` at package root).                              |
| [exportsAliasesDiffs](functions/exportsAliasesDiffs.md)                   | Fail closed on package.json `exportsAliases` (explicit remaps).                                                                                       |
| [generateExports](functions/generateExports.md)                           | Write computed exports into package.json. Refuses if WORKFLOW AREA markers are present (M0 limitation).                                               |
| [leafExportRemapDiffs](functions/leafExportRemapDiffs.md)                 | Leaf export keys must mirror disk paths (no `./foo` → `./lib/foo.ts` remaps). Pattern keys (`*`) are skipped here — validated by pattern coverage.    |
| [listExportableFiles](functions/listExportableFiles.md)                   | List exportable source files: all `.ts`/`.tsx` under the package directory (recursive). Excludes tests, fixtures, bin, docs, workflows, and `env.ts`. |
| [packageHasWorkflowMarkers](functions/packageHasWorkflowMarkers.md)       | True if package.json text contains a WORKFLOW AREA marker.                                                                                            |
| [resolvePackageDir](functions/resolvePackageDir.md)                       | Resolve a workspace package name to its directory.                                                                                                    |
| [sortExportsMap](functions/sortExportsMap.md)                             | -                                                                                                                                                     |
