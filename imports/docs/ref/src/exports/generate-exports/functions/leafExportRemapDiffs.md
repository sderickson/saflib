[**@saflib/imports**](../../../../index.md)

---

# Function: leafExportRemapDiffs()

> **leafExportRemapDiffs**(`map`): `string`[]

Leaf export keys must mirror disk paths (no `./foo` → `./lib/foo.ts` remaps).
Pattern keys (`*`) are skipped here — validated by pattern coverage.

## Parameters

| Parameter | Type                                          |
| --------- | --------------------------------------------- |
| `map`     | [`ExportsMap`](../type-aliases/ExportsMap.md) |

## Returns

`string`[]
