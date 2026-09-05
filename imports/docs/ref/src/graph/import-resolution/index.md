[**@saflib/imports**](../../../index.md)

---

# src/graph/import-resolution

## Interfaces

| Interface                                  | Description                                                                                  |
| ------------------------------------------ | -------------------------------------------------------------------------------------------- |
| [ImportUsedBy](interfaces/ImportUsedBy.md) | Resolve import specifiers to modules within a known package — no FS, linear string ops only. |

## Functions

| Function                                                      | Description                                                                                                                                                                                                                            |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [exportUsedByKey](functions/exportUsedByKey.md)               | -                                                                                                                                                                                                                                      |
| [moduleTargetFromImport](functions/moduleTargetFromImport.md) | If `specifier` targets `packageName`, return the package-relative module path without extension (e.g. `form-artifact-paths`, `queries/matter/create`). Relative imports only resolve when the importer lives under `packageDirectory`. |
| [packageLocalPath](functions/packageLocalPath.md)             | Package-local path for display: strip the package directory prefix.                                                                                                                                                                    |
| [resolveRelative](functions/resolveRelative.md)               | POSIX-ish resolve of `fromDir/specifier` without touching the filesystem.                                                                                                                                                              |
| [stripTsExt](functions/stripTsExt.md)                         | -                                                                                                                                                                                                                                      |
