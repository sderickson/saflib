[**@saflib/monorepo**](../../../../index.md)

---

# Function: checkExports()

> **checkExports**(`pkgDir`): [`CheckExportsResult`](../interfaces/CheckExportsResult.md)

Diff generated exports against committed `package.json` exports.
Packages with wildcard export keys use pattern coverage validation instead.

## Parameters

| Parameter | Type     |
| --------- | -------- |
| `pkgDir`  | `string` |

## Returns

[`CheckExportsResult`](../interfaces/CheckExportsResult.md)
