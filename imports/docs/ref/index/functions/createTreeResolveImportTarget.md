[**@saflib/imports**](../../index.md)

---

# Function: createTreeResolveImportTarget()

> **createTreeResolveImportTarget**(`options`): (`importerPath`, `specifier`) => `null` \| `string`

Resolve import specifiers to repo-relative paths using a commit tree (no FS).
Handles `#` import maps, relative imports, and workspace package exports.

## Parameters

| Parameter | Type                                   |
| --------- | -------------------------------------- |
| `options` | `CreateTreeResolveImportTargetOptions` |

## Returns

> (`importerPath`, `specifier`): `null` \| `string`

### Parameters

| Parameter      | Type     |
| -------------- | -------- |
| `importerPath` | `string` |
| `specifier`    | `string` |

### Returns

`null` \| `string`
