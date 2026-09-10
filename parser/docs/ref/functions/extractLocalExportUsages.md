[**@saflib/parser**](../index.md)

---

# Function: extractLocalExportUsages()

> **extractLocalExportUsages**(`source`): `string`[]

Export names that are referenced as **values** elsewhere in the same file
(beyond their declaration). Used so same-file helpers aren't false `dead-code`
(they get a self `usedBy` edge and are otherwise ignored).

Skips: binding declaration names, export-clause names, property/method names,
and identifiers in type positions.

## Parameters

| Parameter | Type     |
| --------- | -------- |
| `source`  | `string` |

## Returns

`string`[]
