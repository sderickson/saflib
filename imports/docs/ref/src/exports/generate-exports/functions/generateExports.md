[**@saflib/imports**](../../../../index.md)

---

# Function: generateExports()

> **generateExports**(`pkgDir`): `object`

Write computed exports into package.json.
Refuses if WORKFLOW AREA markers are present (M0 limitation).

## Parameters

| Parameter | Type     |
| --------- | -------- |
| `pkgDir`  | `string` |

## Returns

`object`

### error?

> `optional` **error**: `string`

### exports

> **exports**: [`ExportsMap`](../type-aliases/ExportsMap.md)

### written

> **written**: `boolean`
