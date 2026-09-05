[**@saflib/imports**](../../../index.md)

---

# src/graph/assemble-used-by

## Interfaces

| Interface                                                    | Description                                                                                                                   |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| [AssembleUsedByOptions](interfaces/AssembleUsedByOptions.md) | Reverse-index of non-test importers for each export in a package. Pure — no FS / git / DB. Key: `${filePath}\0${exportName}`. |
| [UsedByImporterUnit](interfaces/UsedByImporterUnit.md)       | -                                                                                                                             |

## Type Aliases

| Type Alias                                         | Description |
| -------------------------------------------------- | ----------- |
| [ExportUsedBy](type-aliases/ExportUsedBy.md)       | -           |
| [ExportUsedByMap](type-aliases/ExportUsedByMap.md) | -           |

## Functions

| Function                                      | Description |
| --------------------------------------------- | ----------- |
| [assembleUsedBy](functions/assembleUsedBy.md) | -           |
