[**@saflib/imports**](../../../index.md)

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

| Function                                                            | Description                                                                                                                                            |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [checkExports](functions/checkExports.md)                           | Diff generated exports against committed `package.json` exports.                                                                                       |
| [computeExportsMap](functions/computeExportsMap.md)                 | Compute the heuristic `exports` map for a package. `index.ts` in a directory maps to `./<dir>` (or `.` at package root).                               |
| [generateExports](functions/generateExports.md)                     | Write computed exports into package.json. Refuses if WORKFLOW AREA markers are present (M0 limitation).                                                |
| [listExportableFiles](functions/listExportableFiles.md)             | List exportable source files: top-level package `.ts`/`.tsx` plus everything under `src/` (recursive). Excludes tests, fixtures, bin, docs, workflows. |
| [packageHasWorkflowMarkers](functions/packageHasWorkflowMarkers.md) | True if package.json text contains a WORKFLOW AREA marker.                                                                                             |
| [resolvePackageDir](functions/resolvePackageDir.md)                 | Resolve a workspace package name to its directory.                                                                                                     |
| [sortExportsMap](functions/sortExportsMap.md)                       | -                                                                                                                                                      |
