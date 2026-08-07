[**@saflib/imports**](../../../../index.md)

---

# Function: listExportableFiles()

> **listExportableFiles**(`pkgDir`): `string`[]

List exportable source files: top-level package `.ts`/`.tsx` plus everything
under `src/` (recursive). Excludes tests, fixtures, bin, docs, workflows.

## Parameters

| Parameter | Type     |
| --------- | -------- |
| `pkgDir`  | `string` |

## Returns

`string`[]
