[**@saflib/imports**](../../../../index.md)

---

# Function: checkReferences()

> **checkReferences**(`options`): [`CheckReferencesResult`](../interfaces/CheckReferencesResult.md)

Diff on-disk tsconfigs against the generator; also fails when the reference
graph contains cycles.

## Parameters

| Parameter       | Type                     |
| --------------- | ------------------------ |
| `options`       | \{ `root?`: `string`; \} |
| `options.root?` | `string`                 |

## Returns

[`CheckReferencesResult`](../interfaces/CheckReferencesResult.md)
