[**@saflib/imports**](../../../../index.md)

---

# Function: assembleUsedBy()

> **assembleUsedBy**(`packageName`, `packageDirectory`, `exports`, `importers`): [`ExportUsedByMap`](../type-aliases/ExportUsedByMap.md)

Reverse-index of non-test importers for each export in a package.
Pure — no FS / git / DB. Key: `${filePath}\0${exportName}`.

Also records same-file self-usages from [UsedByImporterUnit.localExportUsages](../interfaces/UsedByImporterUnit.md#localexportusages).

## Parameters

| Parameter          | Type                                                          |
| ------------------ | ------------------------------------------------------------- |
| `packageName`      | `string`                                                      |
| `packageDirectory` | `string`                                                      |
| `exports`          | `object`[]                                                    |
| `importers`        | [`UsedByImporterUnit`](../interfaces/UsedByImporterUnit.md)[] |

## Returns

[`ExportUsedByMap`](../type-aliases/ExportUsedByMap.md)
