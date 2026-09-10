[**@saflib/imports**](../../../../index.md)

---

# Function: moduleTargetFromImport()

> **moduleTargetFromImport**(`packageName`, `packageDirectory`, `importerPath`, `specifier`): `null` \| `string`

If `specifier` targets `packageName`, return the package-relative module path
without extension (e.g. `form-artifact-paths`, `queries/matter/create`).
Relative imports only resolve when the importer lives under `packageDirectory`.

## Parameters

| Parameter          | Type     |
| ------------------ | -------- |
| `packageName`      | `string` |
| `packageDirectory` | `string` |
| `importerPath`     | `string` |
| `specifier`        | `string` |

## Returns

`null` \| `string`
