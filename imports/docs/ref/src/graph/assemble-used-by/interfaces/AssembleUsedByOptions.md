[**@saflib/imports**](../../../../index.md)

---

# Interface: AssembleUsedByOptions

Reverse-index of non-test importers for each export in a package.
Pure — no FS / git / DB. Key: `${filePath}\0${exportName}`.

Also records same-file self-usages from [UsedByImporterUnit.localExportUsages](UsedByImporterUnit.md#localexportusages).

## Properties

### resolveImportTarget()?

> `optional` **resolveImportTarget**: (`importerPath`, `specifier`) => `null` \| `string`

Resolve an import to the repo-relative path of the target module file.
Used for workspace package exports and `#` import maps where
[moduleTargetFromImport](../../import-resolution/functions/moduleTargetFromImport.md) only matches disk-shaped subpaths.

#### Parameters

| Parameter      | Type     |
| -------------- | -------- |
| `importerPath` | `string` |
| `specifier`    | `string` |

#### Returns

`null` \| `string`
