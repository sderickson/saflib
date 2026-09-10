[**@saflib/imports**](../../../../index.md)

---

# Function: applyCompositionRootReferences()

> **applyCompositionRootReferences**(`graph`, `rootDir`): `void`

Packages may declare `safImports.compositionRoot` in `package.json` to union
additional project references beyond workspace dependencies (e.g. a monolith
composition root that must reference every sibling service package).

## Parameters

| Parameter | Type                                                  |
| --------- | ----------------------------------------------------- |
| `graph`   | [`ReferenceGraph`](../type-aliases/ReferenceGraph.md) |
| `rootDir` | `string`                                              |

## Returns

`void`
